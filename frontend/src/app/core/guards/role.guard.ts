import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const requiredRoles = route.data['roles'] as string[];
    const currentUser = this.authService.currentUser;

    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(currentUser.role)) {
        this.router.navigate(['/dashboard']);
        return false;
      }
    }

    return true;
  }
}
