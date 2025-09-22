import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanRequestModalComponent } from './loan-request-modal.component';

describe('LoanRequestModalComponent', () => {
  let component: LoanRequestModalComponent;
  let fixture: ComponentFixture<LoanRequestModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanRequestModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoanRequestModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
