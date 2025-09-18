import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, EMPTY } from 'rxjs';
import {
  SupportRequest,
  SupportRequestNote,
  SupportRequestStatus,
  SupportRequestFilters,
} from '../../../shared/models/support-request.interface';
import { SupportRequestsService } from '../../../shared/services/support-requests.service';

interface SupportRequestsState {
  requests: SupportRequest[];
  loading: boolean;
  error: string | null;
  selectedRequest: SupportRequest | null;
  filters: SupportRequestFilters;
}

const initialState: SupportRequestsState = {
  requests: [],
  loading: false,
  error: null,
  selectedRequest: null,
  filters: {},
};

export const SupportRequestsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    filteredRequests: computed(() => {
      const { requests, filters } = store;
      let filtered = requests();

      if (filters().status) {
        filtered = filtered.filter((req) => req.status === filters().status);
      }

      if (filters().userId) {
        filtered = filtered.filter((req) => req.userId === filters().userId);
      }

      if (filters().userEmail) {
        filtered = filtered.filter((req) =>
          req.userEmail.toLowerCase().includes(filters().userEmail!.toLowerCase())
        );
      }

      if (filters().dateFrom) {
        filtered = filtered.filter((req) => req.createdAt >= filters().dateFrom!);
      }

      if (filters().dateTo) {
        filtered = filtered.filter((req) => req.createdAt <= filters().dateTo!);
      }

      return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),
    requestsByStatus: computed(() => {
      const requests = store.requests();
      return {
        new: requests.filter((req) => req.status === 'new').length,
        'in-progress': requests.filter((req) => req.status === 'in-progress').length,
        completed: requests.filter((req) => req.status === 'completed').length,
        cancelled: requests.filter((req) => req.status === 'cancelled').length,
      };
    }),
    totalRequests: computed(() => store.requests().length),
  })),
  withMethods((store, supportRequestsService = inject(SupportRequestsService)) => ({
    loadRequests: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          supportRequestsService.getSupportRequests().pipe(
            tap((requests) => {
              patchState(store, {
                requests: requests.map((req) => ({
                  ...req,
                  createdAt: new Date(req.createdAt),
                  updatedAt: new Date(req.updatedAt),
                })),
                loading: false,
              });
            }),
            catchError((error) => {
              patchState(store, {
                error: error.message || 'Failed to load support requests',
                loading: false,
              });
              return EMPTY;
            })
          )
        )
      )
    ),

    loadRequestById: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap((id) =>
          supportRequestsService.getSupportRequestById(id).pipe(
            tap((request) => {
              patchState(store, {
                selectedRequest: {
                  ...request,
                  createdAt: new Date(request.createdAt),
                  updatedAt: new Date(request.updatedAt),
                },
                loading: false,
              });
            }),
            catchError((error) => {
              patchState(store, {
                error: error.message || 'Failed to load support request',
                loading: false,
              });
              return EMPTY;
            })
          )
        )
      )
    ),

    updateRequestStatus: rxMethod<{ id: string; status: SupportRequestStatus }>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(({ id, status }) =>
          supportRequestsService.updateSupportRequest(id, { status }).pipe(
            tap((updatedRequest) => {
              const requests = store.requests();
              const updatedRequests = requests.map((req) =>
                req.id === id
                  ? {
                      ...updatedRequest,
                      createdAt: new Date(updatedRequest.createdAt),
                      updatedAt: new Date(updatedRequest.updatedAt),
                    }
                  : req
              );

              patchState(store, {
                requests: updatedRequests,
                selectedRequest:
                  store.selectedRequest()?.id === id
                    ? {
                        ...updatedRequest,
                        createdAt: new Date(updatedRequest.createdAt),
                        updatedAt: new Date(updatedRequest.updatedAt),
                      }
                    : store.selectedRequest(),
                loading: false,
              });
            }),
            catchError((error) => {
              patchState(store, {
                error: error.message || 'Failed to update support request',
                loading: false,
              });
              return EMPTY;
            })
          )
        )
      )
    ),

    addNoteToRequest: rxMethod<{
      id: string;
      note: string;
      authorId: string;
      authorName: string;
      role: 'user' | 'admin';
    }>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(({ id, note, authorId, authorName, role }) => {
          const currentRequest = store.requests().find((req) => req.id === id);
          if (!currentRequest) {
            patchState(store, { error: 'Request not found', loading: false });
            return EMPTY;
          }

          const newNote: SupportRequestNote = {
            id: Date.now().toString(), // Simple ID generation
            authorId,
            authorName,
            role,
            message: note,
            createdAt: new Date(),
          };

          const updatedNotes = [...currentRequest.notes, newNote];
          return supportRequestsService.updateSupportRequest(id, { notes: updatedNotes }).pipe(
            tap((updatedRequest) => {
              const requests = store.requests();
              const updatedRequests = requests.map((req) =>
                req.id === id
                  ? {
                      ...updatedRequest,
                      createdAt: new Date(updatedRequest.createdAt),
                      updatedAt: new Date(updatedRequest.updatedAt),
                    }
                  : req
              );

              patchState(store, {
                requests: updatedRequests,
                selectedRequest:
                  store.selectedRequest()?.id === id
                    ? {
                        ...updatedRequest,
                        createdAt: new Date(updatedRequest.createdAt),
                        updatedAt: new Date(updatedRequest.updatedAt),
                      }
                    : store.selectedRequest(),
                loading: false,
              });
            }),
            catchError((error) => {
              patchState(store, {
                error: error.message || 'Failed to add note',
                loading: false,
              });
              return EMPTY;
            })
          );
        })
      )
    ),

    setFilters: (filters: SupportRequestFilters) => {
      patchState(store, { filters });
    },

    clearFilters: () => {
      patchState(store, { filters: {} });
    },

    selectRequest: (request: SupportRequest | null) => {
      patchState(store, { selectedRequest: request });
    },

    clearError: () => {
      patchState(store, { error: null });
    },
  }))
);
