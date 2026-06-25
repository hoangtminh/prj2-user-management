"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { setAuthToken, setRefreshToken, authActions } from "@/app/api/client";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginAttempted = useRef(false);

  useEffect(() => {
    if (loginAttempted.current) return;
    
    const code = searchParams.get("code");
    if (!code) {
      toast.error("Không tìm thấy mã xác thực Google.");
      router.push("/login");
      return;
    }

    loginAttempted.current = true;

    const exchangeCode = async () => {
      try {
        const redirectUri = `${window.location.protocol}//${window.location.host}/auth/callback`;
        const response = await authActions.googleLogin(code, redirectUri);
        
        if (response.success && response.data?.token) {
          const { accessToken, refreshToken } = response.data.token;
          setAuthToken(accessToken);
          setRefreshToken(refreshToken);
          
          // Fetch current user details to check the role
          const meResponse = await authActions.getMe();
          if (meResponse.success && meResponse.data) {
            if (meResponse.data.role !== "ADMIN") {
              toast.error("Quyền truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền truy cập trang quản trị.");
              authActions.logout();
              router.push("/login");
              return;
            }
            toast.success("Đăng nhập bằng Google thành công!");
            router.push("/users");
          } else {
            toast.error("Không thể tải thông tin tài khoản.");
            authActions.logout();
            router.push("/login");
          }
        } else {
          toast.error(response.error || "Không thể xác thực tài khoản Google.");
          router.push("/login");
        }
      } catch (err) {
        toast.error("Đã xảy ra lỗi khi kết nối với Google.");
        console.error(err);
        router.push("/login");
      }
    };

    exchangeCode();
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={1.5} />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Đang xác thực tài khoản Google...
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background min-h-screen">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={1.5} />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Đang tải...
          </p>
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
