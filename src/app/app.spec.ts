import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App
      ],

      providers: [
        provideRouter([])
      ],
    }).compileComponents();
  });


  it('should create the app', () => {
    const fixture =
      TestBed.createComponent(App);

    const app =
      fixture.componentInstance;

    expect(app).toBeTruthy();
  });

});
describe('App demo user menu', () => {
  it('shows custom menu, changes mock user and confirms logout', () => {
    TestBed.configureTestingModule({imports:[App],providers:[provideRouter([])]});
    const fixture=TestBed.createComponent(App);const app=fixture.componentInstance;fixture.detectChanges();
    fixture.nativeElement.querySelector('.user-trigger').click();fixture.detectChanges();expect(fixture.nativeElement.querySelector('.user-menu')).toBeTruthy();
    app.userDialog='switch';app.nextUser='carlos';app.applyUser();fixture.detectChanges();expect(app.session.user).toBe('CARLOS ALMEIDA');
    app.userDialog='logout';fixture.detectChanges();expect(fixture.nativeElement.querySelector('[role=dialog]')).toBeTruthy();
    app.session.logout();expect(app.session.loggedIn).toBeFalse();
  });
});
