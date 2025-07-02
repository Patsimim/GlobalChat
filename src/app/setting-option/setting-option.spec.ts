import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingOption } from './setting-option';

describe('SettingOption', () => {
  let component: SettingOption;
  let fixture: ComponentFixture<SettingOption>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingOption]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingOption);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
