import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertHostComponent } from './alert-host.component';

describe('AlertHostComponent', () => {
  let component: AlertHostComponent;
  let fixture: ComponentFixture<AlertHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertHostComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
