import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import { defineSecret, defineString } from 'firebase-functions/params';
import { randomUUID } from 'crypto';

// NOTE: admin.initializeApp() is called in index.ts
const MAIL_HOST = defineString('MAIL_HOST');
const MAIL_PORT = defineString('MAIL_PORT', { default: '465' });
const MAIL_USER = defineString('MAIL_USER');
const MAIL_FROM = defineString('MAIL_FROM', { default: '' });
const MAIL_SECURE = defineString('MAIL_SECURE', { default: '' });
const MAIL_PASSWORD = defineSecret('MAIL_PASSWORD');
const storage = new Storage();
const BUCKET_NAME = 'gitplumbers-35d92-storage';
const firestore = admin.firestore();

// Helper function to get mail transporter
function getMailTransporter() {
  const smtpHost = MAIL_HOST.value();
  const smtpPort = Number(MAIL_PORT.value() || '465');
  const smtpUser = MAIL_USER.value();
  const smtpPassword = MAIL_PASSWORD.value();
  const secureRaw = MAIL_SECURE.value();
  const smtpSecure = secureRaw ? secureRaw.toLowerCase() === 'true' : smtpPort === 465;
  const defaultFromEmail = MAIL_FROM.value() || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error('Mail config missing fields:', {
      hostSet: Boolean(smtpHost),
      userSet: Boolean(smtpUser),
      passwordSet: Boolean(smtpPassword),
    });
    throw new Error('Missing required mail configuration (MAIL_HOST, MAIL_USER, MAIL_PASSWORD).');
  }

  return {
    transporter: nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    }),
    defaultFromEmail,
  };
}
export const handleContactForm = onRequest(
  {
    cors: true,
    secrets: [MAIL_PASSWORD],
  },
  async (req, res) => {
    console.log('🔥 handleContactForm v2 HTTP called!');
    console.log('📝 Method:', req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const data = req.body.data || req.body;
      console.log('📨 Received contact form data:', JSON.stringify(data));
      const { name, email, message, githubRepo, filePath } = data;

      if (!name || !email || !message) {
        console.log('❌ Missing required fields:', {
          name: !!name,
          email: !!email,
          message: !!message,
        });
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      let attachmentSignedUrl: string | null = null;
      if (filePath) {
        try {
          const [signedUrl] = await storage
            .bucket(BUCKET_NAME)
            .file(filePath)
            .getSignedUrl({
              version: 'v4',
              action: 'read',
              expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });
          attachmentSignedUrl = signedUrl;
        } catch (generateUrlError) {
          console.error('Failed to generate attachment read URL:', generateUrlError);
        }
      }

      console.log('✅ Form validation passed, saving to Firestore...');

      // Save form data to Firestore
      await firestore.collection('contacts').add({
        name,
        email,
        message,
        githubRepo: githubRepo || null,
        attachmentPath: filePath || null,
        attachmentUrl: attachmentSignedUrl,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Get mail transporter and send email notification
      console.log('Email: preparing transporter');
      let emailSent = false;
      try {
        const { transporter, defaultFromEmail } = getMailTransporter();

        console.log('Email: transporter ready');
        const attachmentUrlForEmail =
          attachmentSignedUrl || (filePath ? `gs://${BUCKET_NAME}/${filePath}` : 'N/A');
        const storagePathLine = filePath ? `\nStorage Path: gs://${BUCKET_NAME}/${filePath}` : '';
        const mailOptions = {
          from: defaultFromEmail,
          to: 'hello@gitplumbers.com',
          subject: `New contact from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nGitHub Repo: ${
            githubRepo || 'N/A'
          }\nAttachment URL: ${attachmentUrlForEmail}${storagePathLine}`,
        };

        console.log('Email: sending notification');
        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log('Email: notification sent');
      } catch (mailError) {
        console.error('Email notification skipped due to error:', mailError);
      }

      res.status(200).json({ success: true, emailSent, attachmentUrl: attachmentSignedUrl });
    } catch (error) {
      console.error('💥 Error processing contact form:', error);
      console.error('💥 Error details:', (error as Error).message);
      console.error('💥 Error stack:', (error as Error).stack);
      res.status(500).json({ error: 'Failed to process contact form' });
    }
  }
);

export const getUploadUrl = onRequest(
  {
    cors: true,
  },
  async (req, res) => {
    console.log('🔥 getUploadUrl v2 HTTP called!');
    console.log('📝 Method:', req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const data = req.body.data || req.body;
      const { fileName, contentType } = data;

      if (!fileName || !contentType) {
        res.status(400).json({ error: 'Missing fileName or contentType' });
        return;
      }

      const bucket = storage.bucket(BUCKET_NAME);
      const safeFileName = String(fileName).replace(/[^A-Za-z0-9._-]/g, '_');
      const uniquePrefix = randomUUID();
      const objectPath = `uploads/${uniquePrefix}-${safeFileName}`;
      const file = bucket.file(objectPath);

      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType,
      };

      const [url] = await file.getSignedUrl(options);
      console.log('✅ Upload URL generated successfully');

      const response = { url, filePath: objectPath };
      console.log('📤 Sending response:', JSON.stringify(response));
      res.status(200).json(response);
    } catch (error) {
      console.error('💥 Error generating upload URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  }
);
