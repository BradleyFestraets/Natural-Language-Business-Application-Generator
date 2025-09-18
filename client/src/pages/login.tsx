/**
 * Login page for Enterprise AI Application Platform
 * Provides Replit Auth integration for secure authentication
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Building2, Shield, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already authenticated
  const { data: user, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user && !isCheckingAuth) {
      setLocation('/dashboard');
    }
  }, [user, isCheckingAuth, setLocation]);

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Redirect to Replit Auth endpoint
      window.location.href = '/api/login';
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  // Show loading while checking auth status
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Enterprise AI Platform</CardTitle>
          <CardDescription className="text-center">
            Natural Language Business Application Generator for Fortune 500 companies
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Enterprise-grade security & RBAC
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {"<15 minute deployment capabilities"}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Multi-tenant organization support
              </span>
            </div>
          </div>

          {/* Login button */}
          <Button 
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
            size="lg"
            data-testid="login-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Replit Auth...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in with Replit
              </>
            )}
          </Button>

          {/* Security notice */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Secure authentication powered by Replit Auth. 
            By signing in, you agree to our enterprise security policies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}