import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

/**
 * Phase 12.9 Stage B1-H: this spec was a stale Angular-CLI scaffold -- AppComponent has
 * no `title` property today (removed long ago in favor of isSidebarOpen/dir/showShell/
 * routerLoading) and app.component.html has no <h1>/"Hello, autoloc-frontend" markup
 * (replaced by the real app shell: sidebar/top-header/breadcrumb/router-outlet/toast).
 * The two stale assertions are replaced with coverage of what the component actually
 * does today, not merely deleted. AppComponent's constructor injects HttpClient and
 * Router (via several providedIn:'root' services), so provideHttpClient()/
 * provideRouter() are required for TestBed to construct it at all -- without them the
 * original spec would also have failed at injection time, separately from the title
 * compile error.
 */
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should start with the sidebar closed and the shell hidden until a route resolves', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.isSidebarOpen).toBe(false);
    expect(app.showShell).toBe(false);
  });

  it('toggleSidebar()/closeSidebar() flip isSidebarOpen', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.toggleSidebar();
    expect(app.isSidebarOpen).toBe(true);
    app.closeSidebar();
    expect(app.isSidebarOpen).toBe(false);
  });

  it('renders the root layout with the current text direction and always renders the toast host', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const layout = compiled.querySelector('.app-layout');
    expect(layout).toBeTruthy();
    expect(layout?.getAttribute('dir')).toBe(fixture.componentInstance.dir);
    expect(compiled.querySelector('app-toast')).toBeTruthy();
  });
});
