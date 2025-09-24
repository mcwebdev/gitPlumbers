import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
import { patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject, computed } from '@angular/core';
import { GitHubIssuesService } from '../services/github-issues.service';
import { MessageService } from 'primeng/api';
import { switchMap, tap, finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface GitHubIssue {
  id: number;
  title: string;
  number: number;
  body?: string;
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
}

interface GitHubIssuesState {
  availableIssues: GitHubIssue[];
  selectedIssueIds: number[];
  loadingAvailableIssues: boolean;
  syncingSelectedIssues: boolean;
  showIssueSelection: boolean;
  error: string | null;
}

const initialState: GitHubIssuesState = {
  availableIssues: [],
  selectedIssueIds: [],
  loadingAvailableIssues: false,
  syncingSelectedIssues: false,
  showIssueSelection: false,
  error: null,
};

export const GitHubIssuesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  
  withComputed((state) => ({
    selectedIssuesCount: computed(() => state.selectedIssueIds().length),
    hasSelectedIssues: computed(() => state.selectedIssueIds().length > 0),
    hasAvailableIssues: computed(() => state.availableIssues().length > 0),
    firstAvailableIssue: computed(() => {
      const issues = state.availableIssues();
      return issues.length > 0 ? issues[0] : null;
    }),
  })),
  
  withMethods((store) => {
    const _githubIssuesService = inject(GitHubIssuesService);
    const _messageService = inject(MessageService);

    const loadAvailableIssues = rxMethod<{ installationId: string; repoFullName: string }>(
      switchMap(({ installationId, repoFullName }) => {
        console.log('🔍 GitHubIssuesStore.loadAvailableIssues: Starting load for:', { installationId, repoFullName });
        
        // Reset state before loading
        patchState(store, {
          loadingAvailableIssues: true,
          availableIssues: [],
          selectedIssueIds: [],
          showIssueSelection: false,
          error: null,
        });

        return _githubIssuesService.fetchAvailableExternalIssues(installationId, repoFullName).pipe(
          tap((result: any) => {
            console.log('📥 GitHubIssuesStore.loadAvailableIssues: Service result:', result);
            
            if (result?.success) {
              const issues = result.issues ?? [];
              console.log('✅ GitHubIssuesStore.loadAvailableIssues: Found', issues.length, 'available issues');
              
              patchState(store, {
                availableIssues: issues,
                showIssueSelection: true, // Always show selection UI after loading (even if 0 issues)
              });

              if (issues.length === 0) {
                _messageService.add({
                  severity: 'info',
                  summary: 'No New Issues',
                  detail: 'All issues for this repository are already synced.',
                });
              } else {
                _messageService.add({
                  severity: 'success',
                  summary: 'Issues Loaded',
                  detail: `Found ${issues.length} issues available for sync.`,
                });
              }
            } else {
              const errorMsg = result?.error || 'Unable to fetch available issues.';
              console.error('❌ GitHubIssuesStore.loadAvailableIssues: Failed:', errorMsg);
              
              patchState(store, { error: errorMsg });
              _messageService.add({
                severity: 'error',
                summary: 'Fetch Failed',
                detail: errorMsg,
              });
            }
          }),
          catchError((error) => {
            const errorMsg = 'Failed to fetch available GitHub issues. Please try again.';
            console.error('❌ GitHubIssuesStore.loadAvailableIssues: Exception:', error);
            
            patchState(store, { error: errorMsg });
            _messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMsg,
            });
            
            return of(null);
          }),
          finalize(() => {
            console.log('🏁 GitHubIssuesStore.loadAvailableIssues: Finished loading');
            patchState(store, { loadingAvailableIssues: false });
          })
        );
      })
    );

    const syncSelectedIssues = rxMethod<{ installationId: string; repoFullName: string }>(
      switchMap(({ installationId, repoFullName }) => {
        const selectedIds = store.selectedIssueIds();
        
        if (selectedIds.length === 0) {
          _messageService.add({
            severity: 'warn',
            summary: 'No Issues Selected',
            detail: 'Please select at least one issue to sync.',
          });
          return of(null);
        }

        console.log('🔄 GitHubIssuesStore.syncSelectedIssues: Starting sync for', selectedIds.length, 'issues');
        patchState(store, { syncingSelectedIssues: true, error: null });

        return _githubIssuesService.syncSelectedExternalIssues(installationId, repoFullName, selectedIds).pipe(
          tap((result: any) => {
            if (result?.success) {
              console.log('✅ GitHubIssuesStore.syncSelectedIssues: Successfully synced', result.count || selectedIds.length, 'issues');
              
              _messageService.add({
                severity: 'success',
                summary: 'Issues Synced',
                detail: `Successfully synced ${result.count || selectedIds.length} selected issues.`,
              });
              
              // Reset state after successful sync
              patchState(store, {
                selectedIssueIds: [],
                showIssueSelection: false,
                availableIssues: [],
              });
            } else {
              const errorMsg = result?.error || 'Unable to sync selected issues.';
              console.error('❌ GitHubIssuesStore.syncSelectedIssues: Failed:', errorMsg);
              
              patchState(store, { error: errorMsg });
              _messageService.add({
                severity: 'error',
                summary: 'Sync Failed',
                detail: errorMsg,
              });
            }
          }),
          catchError((error) => {
            const errorMsg = 'Failed to sync selected GitHub issues. Please try again.';
            console.error('❌ GitHubIssuesStore.syncSelectedIssues: Exception:', error);
            
            patchState(store, { error: errorMsg });
            _messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMsg,
            });
            
            return of(null);
          }),
          finalize(() => {
            patchState(store, { syncingSelectedIssues: false });
          })
        );
      })
    );

    function setSelectedIssueIds(ids: number[]): void {
      console.log('🔄 GitHubIssuesStore.setSelectedIssueIds: Setting selected IDs:', ids);
      patchState(store, { selectedIssueIds: ids });
    }

    function cancelIssueSelection(): void {
      console.log('❌ GitHubIssuesStore.cancelIssueSelection: Canceling selection');
      patchState(store, {
        showIssueSelection: false,
        selectedIssueIds: [],
        availableIssues: [],
        error: null,
      });
    }

    function resetState(): void {
      patchState(store, initialState);
    }

    return {
      // Actions
      loadAvailableIssues,
      syncSelectedIssues,
      setSelectedIssueIds,
      cancelIssueSelection,
      resetState,
    };
  })
);
