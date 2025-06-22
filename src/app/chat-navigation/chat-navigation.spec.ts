import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatNavigation } from './chat-navigation';

describe('ChatNavigation', () => {
  let component: ChatNavigation;
  let fixture: ComponentFixture<ChatNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatNavigation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatNavigation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
