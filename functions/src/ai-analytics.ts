import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface AiTrafficEvent {
  eventType:
    | 'ai_traffic'
    | 'page_view'
    | 'conversion'
    | 'engagement'
    | 'ai_citation'
    | 'search_performance';
  eventName?: string;
  data: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent?: string;
  sessionId?: string;
}

interface AiTrafficAnalytics {
  totalAiVisits: number;
  aiSources: Record<
    string,
    {
      visits: number;
      conversions: number;
      avgSessionDuration: number;
      topPages: string[];
    }
  >;
  topQueries: Array<{
    query: string;
    count: number;
    conversionRate: number;
  }>;
  performanceMetrics: {
    aiTrafficConversionRate: number;
    organicTrafficConversionRate: number;
    aiTrafficBounceRate: number;
    organicTrafficBounceRate: number;
  };
}

// Strongly-typed metrics document stored in Firestore
interface DailyMetricsDoc {
  date: string;
  totalEvents: number;
  aiTrafficEvents: number;
  conversionEvents: number;
  sources: Record<string, number>;
  topPages: Record<string, number>;
  queries: Record<string, number>;
}

export const handleAiAnalytics = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    console.log('🔍 AI Analytics endpoint called');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, GET');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    const db = getFirestore();

    try {
      if (req.method === 'POST') {
        await handleAnalyticsEvent(req, res, db);
      } else if (req.method === 'GET') {
        await getAnalyticsReport(req, res, db);
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

async function handleAnalyticsEvent(
  req: any,
  res: any,
  db: FirebaseFirestore.Firestore
): Promise<void> {
  const eventData: AiTrafficEvent = req.body;

  // Validate required fields
  if (!eventData.eventType || !eventData.timestamp || !eventData.url) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Store event in Firestore
  const eventDoc = {
    ...eventData,
    createdAt: new Date(eventData.timestamp),
    ip: req.ip,
    country: req.headers['cf-ipcountry'] || 'unknown',
  };

  await db.collection('ai_analytics_events').add(eventDoc);

  // Update aggregated metrics
  await updateAggregatedMetrics(db, eventData);

  res.status(200).json({ success: true, eventId: eventDoc });
}

async function getAnalyticsReport(
  req: any,
  res: any,
  db: FirebaseFirestore.Firestore
): Promise<void> {
  const { startDate, endDate, type } = req.query;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  try {
    let query = db
      .collection('ai_analytics_events')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end);

    if (type) {
      query = query.where('eventType', '==', type);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const analytics = generateAnalyticsReport(events);

    res.status(200).json({
      success: true,
      period: { start: start.toISOString(), end: end.toISOString() },
      totalEvents: events.length,
      analytics,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}

async function updateAggregatedMetrics(
  db: FirebaseFirestore.Firestore,
  eventData: AiTrafficEvent
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const metricsRef = db.collection('ai_analytics_metrics').doc(today);

  await db.runTransaction(async (transaction) => {
    const metricsDoc = await transaction.get(metricsRef);
    let currentMetrics: DailyMetricsDoc;
    if (metricsDoc.exists) {
      currentMetrics = metricsDoc.data() as DailyMetricsDoc;
    } else {
      currentMetrics = {
        date: today,
        totalEvents: 0,
        aiTrafficEvents: 0,
        conversionEvents: 0,
        sources: {},
        topPages: {},
        queries: {},
      };
    }

    // Update counters
    currentMetrics.totalEvents++;

    if (eventData.eventType === 'ai_traffic') {
      currentMetrics.aiTrafficEvents++;

      const source = (eventData.data as any).source || 'unknown';
      currentMetrics.sources[source] = (currentMetrics.sources[source] || 0) + 1;
    }

    if (eventData.eventType === 'conversion') {
      currentMetrics.conversionEvents++;
    }

    if (eventData.eventType === 'page_view' && eventData.url) {
      const page = eventData.url;
      if (!currentMetrics.topPages) currentMetrics.topPages = {};
      currentMetrics.topPages[page] = (currentMetrics.topPages[page] || 0) + 1;
    }

    if (
      eventData.eventType === 'search_performance' &&
      eventData.data &&
      typeof (eventData.data as any).query === 'string'
    ) {
      const query = (eventData.data as any).query;
      if (!currentMetrics.queries) currentMetrics.queries = {};
      currentMetrics.queries[query] = (currentMetrics.queries[query] || 0) + 1;
    }

    transaction.set(metricsRef, currentMetrics);
  });
}

function generateAnalyticsReport(events: any[]): AiTrafficAnalytics {
  const aiTrafficEvents = events.filter((e) => e.eventType === 'ai_traffic');
  const conversionEvents = events.filter((e) => e.eventType === 'conversion');
  const pageViewEvents = events.filter((e) => e.eventType === 'page_view');

  // Calculate AI sources breakdown
  const aiSources: Record<string, any> = {};
  aiTrafficEvents.forEach((event) => {
    const source = event.data?.source || 'unknown';
    if (!aiSources[source]) {
      aiSources[source] = {
        visits: 0,
        conversions: 0,
        avgSessionDuration: 0,
        topPages: [],
      };
    }
    aiSources[source].visits++;
  });

  // Calculate conversion rates
  const aiConversions = conversionEvents.filter((e) => e.data?.isAiTraffic).length;
  const organicConversions = conversionEvents.filter((e) => !e.data?.isAiTraffic).length;
  const aiPageViews = pageViewEvents.filter((e) => e.data?.isAiTraffic).length;
  const organicPageViews = pageViewEvents.filter((e) => !e.data?.isAiTraffic).length;

  // Extract top queries
  const queryEvents = events.filter((e) => e.eventType === 'search_performance');
  const queryMap: Record<string, number> = {};
  queryEvents.forEach((event) => {
    const query = event.data?.query;
    if (query) {
      queryMap[query] = (queryMap[query] || 0) + 1;
    }
  });

  const topQueries = Object.entries(queryMap)
    .map(([query, count]) => ({
      query,
      count,
      conversionRate: 0, // Would need more complex calculation
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalAiVisits: aiTrafficEvents.length,
    aiSources,
    topQueries,
    performanceMetrics: {
      aiTrafficConversionRate: aiPageViews > 0 ? (aiConversions / aiPageViews) * 100 : 0,
      organicTrafficConversionRate:
        organicPageViews > 0 ? (organicConversions / organicPageViews) * 100 : 0,
      aiTrafficBounceRate: 0, // Would need session tracking
      organicTrafficBounceRate: 0, // Would need session tracking
    },
  };
}

// Export function for AI citation tracking
export const trackAiCitation = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { platform, content, url, query } = req.body;

    if (!platform || !content) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const db = getFirestore();

    try {
      await db.collection('ai_citations').add({
        platform,
        content: content.substring(0, 500), // Limit content length
        url,
        query,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Citation tracking error:', error);
      res.status(500).json({ error: 'Failed to track citation' });
    }
  }
);

// Dashboard endpoint for analytics visualization
export const getAiAnalyticsDashboard = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const db = getFirestore();

    try {
      // Get last 30 days of metrics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const metricsSnapshot = await db
        .collection('ai_analytics_metrics')
        .where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
        .orderBy('date', 'desc')
        .get();

      const metrics = metricsSnapshot.docs.map((doc) => doc.data());

      // Get recent citations
      const citationsSnapshot = await db
        .collection('ai_citations')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      const citations = citationsSnapshot.docs.map((doc) => doc.data());

      const dashboard = {
        summary: {
          totalAiTraffic: metrics.reduce((sum, m) => sum + (m.aiTrafficEvents || 0), 0),
          totalConversions: metrics.reduce((sum, m) => sum + (m.conversionEvents || 0), 0),
          topAiSources: aggregateTopSources(metrics),
          growthTrend: calculateGrowthTrend(metrics),
        },
        dailyMetrics: metrics,
        recentCitations: citations,
        performanceInsights: generateInsights(metrics),
      };

      res.status(200).json(dashboard);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  }
);

function aggregateTopSources(metrics: any[]): Array<{ source: string; visits: number }> {
  const sourceMap: Record<string, number> = {};

  metrics.forEach((metric) => {
    if (metric.sources) {
      Object.entries(metric.sources).forEach(([source, visits]) => {
        sourceMap[source] = (sourceMap[source] || 0) + (visits as number);
      });
    }
  });

  return Object.entries(sourceMap)
    .map(([source, visits]) => ({ source, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
}

function calculateGrowthTrend(metrics: any[]): number {
  if (metrics.length < 2) return 0;

  const recent = metrics.slice(0, 7).reduce((sum, m) => sum + (m.aiTrafficEvents || 0), 0);
  const previous = metrics.slice(7, 14).reduce((sum, m) => sum + (m.aiTrafficEvents || 0), 0);

  return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
}

function generateInsights(metrics: any[]): string[] {
  const insights: string[] = [];

  const totalAiTraffic = metrics.reduce((sum, m) => sum + (m.aiTrafficEvents || 0), 0);
  const totalTraffic = metrics.reduce((sum, m) => sum + (m.totalEvents || 0), 0);

  if (totalTraffic > 0) {
    const aiPercentage = (totalAiTraffic / totalTraffic) * 100;
    insights.push(`AI traffic represents ${aiPercentage.toFixed(1)}% of total traffic`);
  }

  const trend = calculateGrowthTrend(metrics);
  if (trend > 10) {
    insights.push(`AI traffic is growing rapidly (+${trend.toFixed(1)}% week-over-week)`);
  } else if (trend < -10) {
    insights.push(`AI traffic is declining (${trend.toFixed(1)}% week-over-week)`);
  }

  return insights;
}
