import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateGroupModalComponent } from './create-group-chat';

describe('CreateGroupChat', () => {
  let component: CreateGroupModalComponent;
  let fixture: ComponentFixture<CreateGroupModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateGroupModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateGroupModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
