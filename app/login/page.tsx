"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthToken, setAuthToken, setRefreshToken, authActions } from "@/app/api/client";
import { Mail, Lock, LogIn, Sun, Moon, GraduationCap } from "lucide-react";
import { useTheme } from "next-themes";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.accessToken) {
        setAuthToken(session.accessToken);
        if (session.refreshToken) {
          setRefreshToken(session.refreshToken);
        }
        
        const checkRoleAndRedirect = async () => {
          setLoading(true);
          const meResponse = await authActions.getMe();
          if (meResponse.success && meResponse.data) {
            if (meResponse.data.role !== "ADMIN") {
              toast.error("Quyền truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền truy cập trang quản trị.");
              await authActions.logout();
              setLoading(false);
              return;
            }
            toast.success("Đăng nhập thành công!");
            router.push("/users");
          } else {
            toast.error("Không thể tải thông tin tài khoản từ server.");
            await authActions.logout();
          }
          setLoading(false);
        };

        checkRoleAndRedirect();
      } else {
        toast.error("Đăng nhập Google thành công nhưng không thể kết nối hoặc xác thực với Server hệ thống.");
        console.error("NextAuth session is active, but backend accessToken is missing. Session payload:", session);
        // authActions.logout();
      }
      return;
    }

    // Redirect if already logged in locally
    const token = getAuthToken();
    if (token) {
      router.push("/users");
    }
  }, [session, status, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng điền đầy đủ thông tin đăng nhập.");
      return;
    }

    setLoading(true);
    try {
      const response = await authActions.login(email, password, true);
      if (response.success && response.data) {
        setAuthToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken);
        
        // Fetch current user details to check the role
        const meResponse = await authActions.getMe();
        if (meResponse.success && meResponse.data) {
          if (meResponse.data.role !== "ADMIN") {
            toast.error("Quyền truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền truy cập trang quản trị.");
            await authActions.logout();
            setLoading(false);
            return;
          }
          toast.success("Đăng nhập thành công!");
          router.push("/users");
        } else {
          toast.error(meResponse.error || "Không thể tải thông tin tài khoản.");
          await authActions.logout();
        }
      } else {
        toast.error(response.error || "Sai tài khoản hoặc mật khẩu.");
      }
    } catch (err) {
      toast.error("Đã xảy ra lỗi khi đăng nhập.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google");
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center min-h-screen bg-background px-4 py-12 transition-colors duration-300">
      {/* Theme Toggler & Logo bar */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 hover:bg-secondary"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-app-primary" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <div className="w-full max-w-[420px] space-y-6">
        {/* Editorial Heading */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-secondary rounded-2xl flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground mt-2">
            Optimind
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Academic Sanctuary Dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-sm bg-card transition-colors duration-300">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">Đăng nhập</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Nhập email và mật khẩu hoặc kết nối qua tài khoản Google của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-br from-primary to-primary/80 hover:opacity-95 text-primary-foreground font-medium rounded-xl h-11 transition-all shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Đăng nhập
              </Button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold text-muted-foreground">
                Hoặc
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full bg-card hover:bg-secondary text-foreground border border-border/40 font-medium rounded-xl h-11 transition-all"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Đăng nhập với Google
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <p className="text-xs text-muted-foreground font-medium">
              Optimind v1.0 • Academic sanctuary for productivity
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
