import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { FormBuilder } from '@angular/forms';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideRouter } from '@angular/router';

import { ContactComponent } from './contact';

describe('ContactComponent', () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent, HttpClientTestingModule],
      providers: [
        MessageService, 
        FormBuilder,
        provideZonelessChangeDetection(),
        provideFirebaseApp(() => initializeApp({
          projectId: 'test-project',
          appId: 'test-app-id'
        })),
        provideFunctions(() => getFunctions()),
        provideRouter([])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build correct GitHub issue URL for selected repository', () => {
    const repoFullName = 'testuser/testrepo';
    const expectedUrl = 'https://github.com/testuser/testrepo/issues/new?template=audit.yml&title=%5BgitPlumbers%5D+Request+Help';
    
    const actualUrl = component['buildIssueUrl'](repoFullName);
    expect(actualUrl).toBe(expectedUrl);
  });

  it('should return null for selectedRepoIssueLink when no repository is selected', () => {
    component.repoForm.patchValue({ repoFullName: '' });
    expect(component.selectedRepoIssueLink).toBeNull();
  });

  it('should return correct URL for selectedRepoIssueLink when repository is selected', () => {
    const repoFullName = 'testuser/testrepo';
    component.repoForm.patchValue({ repoFullName });
    
    const expectedUrl = 'https://github.com/testuser/testrepo/issues/new?template=audit.yml&title=%5BgitPlumbers%5D+Request+Help';
    expect(component.selectedRepoIssueLink).toBe(expectedUrl);
  });
});
