"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getAuthToken,
  authActions,
  userActions,
  chatActions,
  UserDto
} from "@/app/api/client";
import {
  Search,
  LogOut,
  Flame,
  Coins,
  Clock,
  Sparkles,
  Shield,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sun,
  Moon,
  Users,
  Trophy,
  Activity,
  Trash2,
  ShieldAlert,
  Send,
  MessageSquare
} from "lucide-react";
import { useTheme } from "next-themes";

export default function UserManagementPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Authentication states
  const [currentUser, setCurrentUser] = useState<UserDto | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // User management states
  const [users, setUsers] = useState<UserDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Detail Modal state
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Direct Message states
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Statistics summaries
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [avgLevel, setAvgLevel] = useState(1);
  const [maxStreak, setMaxStreak] = useState(0);

  // Verify Auth on mount (Ensuring only ADMIN has access)
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        toast.error("Vui lòng đăng nhập để tiếp tục.");
        router.push("/login");
        return;
      }

      try {
        const response = await authActions.getMe();
        if (response.success && response.data) {
          if (response.data.role !== "ADMIN") {
            toast.error("Quyền truy cập bị từ chối. Chỉ tài khoản Admin mới được truy cập hệ thống.");
            authActions.logout();
            router.push("/login");
            return;
          }
          setCurrentUser(response.data);
          setAuthLoading(false);
        } else {
          toast.error("Phiên đăng nhập hết hạn.");
          authActions.logout();
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
        authActions.logout();
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  // Fetch users when search query or page changes
  useEffect(() => {
    if (authLoading) return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await userActions.searchUsers(searchQuery, currentPage, 6);
        if (response.success && response.data) {
          const pageData = response.data;
          setUsers(pageData.content);
          setTotalPages(pageData.totalPages);
          setTotalElements(pageData.totalElements);

          // Calculate some local statistics from the page content for visual embellishment
          if (pageData.content.length > 0) {
            const totalSecs = pageData.content.reduce((acc, u) => acc + (u.studyTime || 0), 0);
            const sumLevel = pageData.content.reduce((acc, u) => acc + (u.level || 1), 0);
            const peakStreak = pageData.content.reduce((acc, u) => Math.max(acc, u.longestStreak || 0), 0);
            
            setTotalStudyTime(Math.round(totalSecs / 60)); // in minutes
            setAvgLevel(Math.round((sumLevel / pageData.content.length) * 10) / 10);
            setMaxStreak(peakStreak);
          }
        } else {
          toast.error(response.error || "Không thể tải danh sách người dùng.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Lỗi khi kết nối với máy chủ.");
      } finally {
        setLoadingUsers(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce queries to prevent rapid network calls

    return () => clearTimeout(delayDebounce);
  }, [authLoading, searchQuery, currentPage]);

  const handleLogout = () => {
    authActions.logout();
    toast.success("Đã đăng xuất thành công.");
    router.push("/login");
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0); // Reset page on new query
  };

  const viewUserDetails = (user: UserDto) => {
    setSelectedUser(user);
    setMessageText(""); // Reset message box
    setDetailsOpen(true);
  };

  // Suspension action
  const handleSuspendUser = async (userId: string, isCurrentlySuspended: boolean) => {
    try {
      const nextSuspendedState = !isCurrentlySuspended;
      const response = await userActions.suspendUser(userId, nextSuspendedState);
      if (response.success && response.data) {
        toast.success(nextSuspendedState ? "Đã tạm ngưng tài khoản thành công." : "Đã kích hoạt lại tài khoản.");
        
        // Update local state list
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: nextSuspendedState } : u));
        
        // Update dialog state
        setSelectedUser(prev => prev ? { ...prev, suspended: nextSuspendedState } : null);
      } else {
        toast.error(response.error || "Không thể cập nhật trạng thái tài khoản.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ khi thực hiện tạm ngưng.");
    }
  };

  // Deletion action
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này? Mọi dữ liệu liên quan sẽ bị xóa sạch.")) {
      return;
    }

    try {
      const response = await userActions.deleteUser(userId);
      if (response.success) {
        toast.success("Xóa tài khoản thành công.");
        setUsers(prev => prev.filter(u => u.id !== userId));
        setTotalElements(prev => prev - 1);
        setDetailsOpen(false);
      } else {
        toast.error(response.error || "Không thể xóa tài khoản.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ khi thực hiện xóa.");
    }
  };

  // Sending message action
  const handleSendMessage = async (email: string) => {
    if (!messageText.trim()) {
      toast.error("Vui lòng nhập nội dung tin nhắn.");
      return;
    }

    setSendingMessage(true);
    try {
      // 1. Create or fetch existing private chat room with target user email
      const chatResponse = await chatActions.createChat(`Admin Hỗ Trợ`, [email], false);
      if (chatResponse.success && chatResponse.data) {
        const chatId = chatResponse.data.id;
        
        // 2. Send the message text to the chat
        const msgResponse = await chatActions.sendMessage(chatId, messageText);
        if (msgResponse.success) {
          toast.success("Đã gửi tin nhắn hỗ trợ thành công!");
          setMessageText("");
        } else {
          toast.error(msgResponse.error || "Gửi tin nhắn thất bại.");
        }
      } else {
        toast.error(chatResponse.error || "Không thể mở phòng chat hỗ trợ.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi kết nối gửi tin nhắn.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Formatting utilities
  const formatStudyTime = (seconds: number) => {
    if (!seconds) return "0 phút";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} giờ ${remainingMins > 0 ? `${remainingMins}p` : ""}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Đang xác thực thông tin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary rounded-xl">
            <GraduationCap className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">Optimind</h1>
            <p className="text-xxs font-semibold text-muted-foreground tracking-wider uppercase">
              Management Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-secondary w-9 h-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-primary" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Account info */}
          <div className="hidden sm:flex items-center gap-3 border-l border-border/20 pl-4">
            <Avatar className="h-8 w-8 border border-primary/20">
              <AvatarImage src={currentUser?.imageUrl} />
              <AvatarFallback className="bg-secondary text-primary font-semibold text-xs">
                {currentUser?.username?.slice(0, 2).toUpperCase() || "OP"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-xs font-semibold text-foreground max-w-[120px] truncate">
                {currentUser?.username}
              </p>
              <p className="text-xxs text-muted-foreground font-medium truncate max-w-[120px]">
                {currentUser?.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-destructive/10 hover:text-destructive w-9 h-9"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <LogOut className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.5} />
          </Button>
        </div>
      </header>

      {/* Main Sanctuary Dashboard Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* Editorial Title Area */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h2>
          <p className="text-sm text-muted-foreground">
            Xem hồ sơ, kiểm tra năng suất, khóa tài khoản, xóa tài khoản và nhắn tin trực tiếp cho học viên.
          </p>
        </div>

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 bg-secondary/40 shadow-none rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Tổng số User</CardTitle>
              <Users className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{totalElements}</div>
              <p className="text-xxs text-muted-foreground mt-1">Người dùng đã đăng ký</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-secondary/40 shadow-none rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Học tập tuần này</CardTitle>
              <Clock className="h-4 w-4 text-app-accent-blue-text" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {totalStudyTime} <span className="text-xs font-medium text-muted-foreground">phút</span>
              </div>
              <p className="text-xxs text-muted-foreground mt-1">Từ trang hiện tại</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-secondary/40 shadow-none rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Level trung bình</CardTitle>
              <Trophy className="h-4 w-4 text-app-accent-yellow-text" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">Lv.{avgLevel}</div>
              <p className="text-xxs text-muted-foreground mt-1">Trình độ trung bình</p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-secondary/40 shadow-none rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground">Chuỗi kỷ lục</CardTitle>
              <Flame className="h-4 w-4 text-app-accent-red-text" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{maxStreak} ngày</div>
              <p className="text-xxs text-muted-foreground mt-1">Chuỗi ngày học liên tục cao nhất</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar Block */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder="Tìm kiếm người dùng theo tên hoặc email..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 h-11 bg-card border border-border/10 focus-visible:ring-1 focus-visible:ring-primary rounded-xl placeholder:text-muted-foreground/60 w-full"
          />
        </div>

        {/* Breathable User Cards Grid */}
        {loadingUsers ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-secondary/10 rounded-2xl">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Đang tìm kiếm thông tin học viên...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 bg-secondary/10 rounded-2xl space-y-2">
            <User className="h-8 w-8 text-muted-foreground/60 mx-auto" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">Không tìm thấy người dùng phù hợp.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <Card 
                  key={user.id} 
                  className={`border-0 bg-card hover:bg-secondary/20 shadow-sm transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer ${
                    user.suspended ? "opacity-75 border-l-4 border-l-destructive" : ""
                  }`}
                  onClick={() => viewUserDetails(user)}
                >
                  <CardHeader className="flex flex-row items-center gap-4 pb-3">
                    <Avatar className="h-12 w-12 border border-border">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback className="bg-secondary text-primary font-bold text-sm">
                        {user.username?.slice(0, 2).toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate block">{user.username}</span>
                        {user.suspended && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xxs font-semibold bg-app-accent-red text-app-accent-red-text">
                            Bị khóa
                          </span>
                        )}
                        {user.role === "ADMIN" ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xxs font-semibold bg-app-accent-blue text-app-accent-blue-text">
                            Admin
                          </span>
                        ) : !user.suspended && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xxs font-semibold bg-app-primary-pastel text-app-primary-pastel-text">
                            Học viên
                          </span>
                        )}
                      </div>
                      <span className="text-xxs text-muted-foreground truncate block mt-0.5">{user.email}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 text-xs space-y-3 pb-5">
                    {/* Stats Highlights */}
                    <div className="grid grid-cols-2 gap-2 bg-secondary/30 p-2.5 rounded-xl text-xxs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-app-accent-yellow-text" strokeWidth={1.5} />
                        <div>
                          <span className="text-muted-foreground block">Cấp độ</span>
                          <span className="font-semibold text-foreground text-[10px]">Cấp {user.level || 1} ({user.exp || 0} EXP)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-app-accent-blue-text" strokeWidth={1.5} />
                        <div>
                          <span className="text-muted-foreground block">Tích lũy</span>
                          <span className="font-semibold text-foreground text-[10px]">{formatStudyTime(user.studyTime)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xxs px-1 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-app-accent-red-text" strokeWidth={1.5} />
                        <span>Streak: <b className="text-foreground">{user.currentStreak || 0} ngày</b></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-app-accent-yellow-text" strokeWidth={1.5} />
                        <span>Coins: <b className="text-foreground">{user.coins || 0}</b></span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Premium Pagination Control */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/10 pt-4 px-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Hiển thị <span className="font-semibold text-foreground">{users.length}</span> trên{" "}
                  <span className="font-semibold text-foreground">{totalElements}</span> người dùng
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:bg-secondary px-3 py-1.5 h-8 text-xs font-semibold"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Trang trước
                  </Button>
                  <span className="text-xs font-semibold text-muted-foreground px-2">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:bg-secondary px-3 py-1.5 h-8 text-xs font-semibold"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Trang sau
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Selected User Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="border-0 max-w-[500px] rounded-2xl bg-card shadow-lg p-6 max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader className="flex flex-row items-center gap-4 text-left pb-4 border-b border-border/10">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarImage src={selectedUser.imageUrl} />
                  <AvatarFallback className="bg-secondary text-primary font-bold text-lg">
                    {selectedUser.username?.slice(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold truncate">{selectedUser.username}</DialogTitle>
                    {selectedUser.suspended && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold bg-app-accent-red text-app-accent-red-text">
                        Đang khóa
                      </span>
                    )}
                    {selectedUser.role === "ADMIN" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold bg-app-accent-blue text-app-accent-blue-text">
                        Admin
                      </span>
                    ) : !selectedUser.suspended && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-semibold bg-app-primary-pastel text-app-primary-pastel-text">
                        Học viên
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                    {selectedUser.email}
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Detailed stats grids */}
              <div className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/40 p-3 rounded-xl flex items-start gap-3">
                    <Sparkles className="h-4 w-4 text-app-accent-yellow-text mt-0.5" strokeWidth={1.5} />
                    <div>
                      <span className="text-muted-foreground text-xxs block">Cấp độ & Điểm số</span>
                      <span className="font-semibold text-sm text-foreground">Lv.{selectedUser.level || 1}</span>
                      <span className="text-xxs text-muted-foreground block mt-0.5">{selectedUser.exp || 0} kinh nghiệm</span>
                    </div>
                  </div>

                  <div className="bg-secondary/40 p-3 rounded-xl flex items-start gap-3">
                    <Clock className="h-4 w-4 text-app-accent-blue-text mt-0.5" strokeWidth={1.5} />
                    <div>
                      <span className="text-muted-foreground text-xxs block">Thời gian học tập</span>
                      <span className="font-semibold text-sm text-foreground">
                        {formatStudyTime(selectedUser.studyTime)}
                      </span>
                      <span className="text-xxs text-muted-foreground block mt-0.5">Tích lũy từ lúc học</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/40 p-3 rounded-xl flex items-start gap-3">
                    <Flame className="h-4 w-4 text-app-accent-red-text mt-0.5" strokeWidth={1.5} />
                    <div>
                      <span className="text-muted-foreground text-xxs block">Chuỗi học liên tục</span>
                      <span className="font-semibold text-sm text-foreground">{selectedUser.currentStreak || 0} ngày</span>
                      <span className="text-xxs text-muted-foreground block mt-0.5">
                        Kỷ lục: {selectedUser.longestStreak || 0} ngày
                      </span>
                    </div>
                  </div>

                  <div className="bg-secondary/40 p-3 rounded-xl flex items-start gap-3">
                    <Coins className="h-4 w-4 text-app-accent-yellow-text mt-0.5" strokeWidth={1.5} />
                    <div>
                      <span className="text-muted-foreground text-xxs block">Số tiền tích lũy</span>
                      <span className="font-semibold text-sm text-foreground">{selectedUser.coins || 0} xu</span>
                      <span className="text-xxs text-muted-foreground block mt-0.5">Dùng để đổi vật phẩm</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info details */}
                <div className="space-y-2 border-t border-border/10 pt-4 text-xxs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      Ngày tạo tài khoản
                    </span>
                    <span className="font-semibold text-foreground">{formatDate(selectedUser.createdAt)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      Lần cuối hoạt động
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatDate(selectedUser.lastActiveDate)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      Quyền truy cập
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedUser.role === "ADMIN" ? "Quản trị viên hệ thống" : "Người dùng phổ thông"}
                    </span>
                  </div>
                </div>

                {/* Admin Message To User Form */}
                {selectedUser.role !== "ADMIN" && (
                  <div className="space-y-2 border-t border-border/10 pt-4">
                    <Label className="text-xxs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                      Gửi tin nhắn hỗ trợ trực tiếp đến học viên
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập tin nhắn..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="h-9 text-xs bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-xl placeholder:text-muted-foreground/60 flex-1"
                        disabled={sendingMessage}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl"
                        onClick={() => handleSendMessage(selectedUser.email)}
                        disabled={sendingMessage || !messageText.trim()}
                      >
                        {sendingMessage ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Account Actions Section */}
                {selectedUser.role !== "ADMIN" && (
                  <div className="space-y-3 border-t border-border/10 pt-4">
                    <span className="text-xxs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                      Thao tác quản trị viên
                    </span>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className={`flex-1 rounded-xl text-xs font-semibold h-9 border border-border/40 hover:bg-secondary/40 ${
                          selectedUser.suspended
                            ? "text-app-accent-green-text bg-app-accent-green/30"
                            : "text-app-accent-red-text bg-app-accent-red/30"
                        }`}
                        onClick={() => handleSuspendUser(selectedUser.id, !!selectedUser.suspended)}
                      >
                        {selectedUser.suspended ? "Kích hoạt tài khoản" : "Tạm ngưng tài khoản"}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 rounded-xl text-xs font-semibold h-9 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDeleteUser(selectedUser.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Xóa vĩnh viễn
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close controls */}
              <div className="flex justify-end gap-2 border-t border-border/10 pt-4">
                <Button 
                  onClick={() => setDetailsOpen(false)}
                  className="bg-secondary text-foreground hover:bg-secondary/80 rounded-xl text-xs font-semibold px-4 h-9"
                >
                  Đóng hồ sơ
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
