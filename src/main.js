import React, { useState, useRef, useEffect } from "react";
import { Send, Globe, User, LogOut } from "lucide-react";
import "./index.css";
import Avatar3D from "./Avatar3D";

export default function ChatApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [dailyCount, setDailyCount] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [language, setLanguage] = useState("ar");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showAIWarning, setShowAIWarning] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const API_BASE = "http://18.217.211.86";

  useEffect(() => {
    document.title =
      language === "ar"
        ? "TweetAI - تحليل تغريدات"
        : "TweetAI - Tweet Analysis";
  }, [language]);

  const handleLogout = () => {
    setToken("");
    setDailyCount(0);

    const farewellText =
      language === "ar"
        ? "👋 لقد تم تسجيل الخروج، إلى اللقاء!"
        : "👋 You have been logged out, see you soon!";

    setChatHistory((prev) => [...prev, { role: "assistant", content: "" }]);

    let i = 0;
    const interval = setInterval(() => {
      setChatHistory((prev) => {
        const last = [...prev];
        last[last.length - 1].content = farewellText.slice(0, i + 1);
        return last;
      });
      i++;
      if (i === farewellText.length) clearInterval(interval);
    }, 30);

    setMessage("");
  };

  const handleSignup = async () => {
    setLoading(true);
    setAuthError("");
    setMessage("");

    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail)\.com$/i;
    if (!emailRegex.test(email)) {
      setAuthError(
        language === "ar"
          ? "يرجى إدخال بريد إلكتروني صحيح من Gmail أو Hotmail فقط (مثال: name@gmail.com)."
          : "Please enter a valid Gmail or Hotmail address (e.g., name@gmail.com)."
      );
      setLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setAuthError(
        language === "ar"
          ? "كلمة المرور يجب أن تحتوي على 8 خانات على الأقل، حرف كبير ورمز."
          : "Password must have at least 8 characters, one uppercase letter, and one symbol."
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": language,
        },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      let errorMsg = "Signup failed";

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
          errorMsg = data.error || data.message || errorMsg;
        } catch (jsonError) {
          errorMsg = "Invalid server response format";
        }
      } else {
        const text = await res.text();

        errorMsg = text || "Unexpected server response";
      }

      if (!res.ok) {
        if (
          res.status === 409 ||
          errorMsg.includes("Email already exists") ||
          errorMsg.includes("EMAIL_EXISTS")
        ) {
          setAuthError(
            language === "ar"
              ? "هذا الحساب موجود فعلاً"
              : "Email already exists"
          );
        } else if (
          res.status === 400 &&
          errorMsg.includes("Password is too weak")
        ) {
          setAuthError(
            language === "ar"
              ? "كلمة المرور ضعيفة جدًا"
              : "Password is too weak"
          );
        } else if (
          res.status === 400 &&
          errorMsg.includes("Invalid email format")
        ) {
          setAuthError(
            language === "ar"
              ? "تنسيق البريد الإلكتروني غير صحيح"
              : "Invalid email format"
          );
        } else {
          setAuthError(
            language === "ar" ? `حدث خطأ: ${errorMsg}` : `Error: ${errorMsg}`
          );
        }
        setLoading(false);
        return;
      }

      const successMessage =
        language === "ar"
          ? "تم إنشاء الحساب بنجاح!"
          : "Account created successfully!";
      setAuthError({ text: successMessage, color: "green" });
      setTimeout(() => setAuthError(""), 5000);
      setLoading(false);
    } catch (err) {
      setAuthError(
        language === "ar" ? `حدث خطأ: ${err.message}` : `Error: ${err.message}`
      );
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok)
        throw new Error(data.error || data.message || "Login failed");

      setToken(data.token);
      setShowAuthModal(false);
      setDailyCount(data.dailyCount || 0);
      setMessage("");
    } catch (err) {
      setAuthError(
        language === "ar"
          ? "خطأ في البريد الإلكتروني أو كلمة المرور"
          : "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (dailyCount >= 2) {
      return;
    }

    const input = chatInput.trim();
    if (!input) return;

    setAutoScroll(true);
    setChatHistory([...chatHistory, { role: "user", content: input }]);
    setChatInput("");
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/fetch-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: input, lan: language }),
      });

      if (!response.ok) {
        let errorText = await response.text();
        if (!errorText) errorText = "خطأ غير معروف";
        throw new Error(errorText);
      }

      setShowAIWarning(true);
      setTimeout(() => setShowAIWarning(false), 3000);
      setChatHistory((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let displayed = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        displayed += decoder.decode(value);

        setChatHistory((prev) => {
          const last = [...prev];
          last[last.length - 1].content = displayed;
          return last;
        });

        if (autoScroll) {
          const el = chatContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        }
      }

      setDailyCount((prev) => prev + 1);
    } catch (err) {
      const errorMessages = {
        ar: {
          noTweets: "لم أجد أي تغريدات لتحليل هذا الحساب.",
          username: "هذا الحساب غير موجود أو لا يمكن الوصول إليه.",
          limit: "لقد تجاوزت الحد اليومي، حاول لاحقًا.",
          unknown: "حدث خطأ أثناء التحليل، حاول مجددًا.",
        },
        en: {
          noTweets: "I couldn’t find any tweets for this account.",
          username: "This account doesn't exist or isn't accessible.",
          limit: "You've reached your daily limit. Try again later.",
          unknown: "An error occurred during analysis. Please try again.",
        },
      };

      let msg;
      const text = err.message || "";
      if (text.includes("No tweets")) msg = errorMessages[language].noTweets;
      else if (text.includes("Username"))
        msg = errorMessages[language].username;
      else if (text.includes("limit")) msg = errorMessages[language].limit;
      else msg = errorMessages[language].unknown;

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: `🤖 ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative">
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <Avatar3D />
      </div>

      <div className="  sticky top-0 z-50 ">
        <div className="w-full px-6 py-4 flex items-center justify-between  relative z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br  rounded-lg flex items-center justify-center">
              <img
                src={`${process.env.PUBLIC_URL}/icon.png`}
                alt="Logo"
                className="w-9 h-9 object-contain"
              />
            </div>
            <h1 className="text-xl font-semibold text-left ml-0">
              {language === "ar" ? "TweetMind AI " : "TweetMind AI"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition"
            >
              <Globe size={18} />
            </button>

            <div
              className="relative"
              onMouseEnter={() => {
                clearTimeout(window.accountMenuTimeout);
                setShowAccountMenu(true);
              }}
              onMouseLeave={() => {
                window.accountMenuTimeout = setTimeout(() => {
                  setShowAccountMenu(false);
                }, 400);
              }}
            >
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition">
                <User size={19} />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl w-48 p-2 text-sm z-20">
                  {token ? (
                    <>
                      <div className="px-3 py-2 text-gray-300 border-b border-gray-800 mb-2">
                        <p>{email || "User"}</p>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-800 rounded-lg transition"
                      >
                        <LogOut size={14} />
                        {language === "ar" ? "تسجيل الخروج" : "Logout"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition"
                    >
                      {language === "ar"
                        ? " تسجيل الدخول / إنشاء حساب"
                        : " Login / Sign Up"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto relative z-10"
        onScroll={(e) => {
          const target = e.target;
          const isAtBottom =
            target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
          setAutoScroll(isAtBottom);
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-8">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="w-50 h-90 bg-gradient-to-br flex items-center justify-center mb-2">
                <span className="text-lg font-medium text-white">
                  {language === "ar"
                    ? "هل واجهت شخصًا غريبًا اليوم؟"
                    : "Have you encountered someone strange today?"}
                </span>
              </div>

              <h2 className="  text-3xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-slate-600 bg-clip-text text-transparent">
                {language === "ar"
                  ? "هل ترغب أن أُطلعك على صورة شخصيته من تغريداته؟"
                  : "Want to see his personality through his tweets?"}
              </h2>

              <p className="text-gray-500 max-w-sm">
                {language === "ar"
                  ? "أدخل اسم المستخدم، ودعني أقرأ ما وراء التغريدات."
                  : "Enter the username, and let me read between the tweets"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className="flex w-full mb-2">
                  {msg.role === "user" ? (
                    <div
                      className={`ml-auto flex items-end gap-2 max-w-[70%] ${
                        language === "ar" ? "text-right" : "text-left"
                      }`}
                      dir={language === "ar" ? "rtl" : "ltr"}
                    >
                      <div className="bg-blue-600/80 text-white px-4 py-2 rounded-2xl whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex items-start gap-2 max-w-[70%] ${
                        language === "ar" ? "text-right" : "text-left"
                      }`}
                      dir={language === "ar" ? "rtl" : "ltr"}
                    >
                      <div className="bg-gray-800/60 text-white px-4 py-2 rounded-2xl whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 items-start">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="max-w-4xl mx-auto px-6 pb-2 relative z-10">
          <div
            className={`text-sm text-center py-2 px-4 rounded-lg ${
              message.startsWith("✅")
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {message}
          </div>
        </div>
      )}

      <div className="  sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="relative">
            <textarea
              placeholder={
                language === "ar" ? "ادخل اسم المستخدم" : "Enter username"
              }
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                if (!token) setShowAuthModal(true);
              }}
              disabled={dailyCount >= 2 || loading}
              rows={1}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-2.5 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 resize-none overflow-hidden transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !chatInput.trim() || dailyCount >= 2}
              className="absolute right-2 bottom-2 p-2.5 bg-white text-black rounded-xl hover:bg-gray-200 disabled:opacity-30 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-8">
              <h3 className="text-white text-2xl font-bold mb-2 text-center">
                {language === "ar" ? "تسجيل الدخول" : "Sign In"}
              </h3>
              <p className="text-gray-400 text-sm text-center mb-8">
                {language === "ar"
                  ? "سجّل الدخول للمتابعة"
                  : "Sign in to continue the conversation"}
              </p>

              <div className="space-y-4">
                <input
                  type="email"
                  placeholder={
                    language === "ar" ? "البريد الإلكتروني" : "Email"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none"
                />
                <input
                  type="password"
                  placeholder={language === "ar" ? "كلمة المرور" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none"
                />
              </div>

              {authError && (
                <p
                  className="text-sm text-center mt-3"
                  style={{ color: authError.color || "red" }}
                >
                  {authError.text || authError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="flex-1 bg-white text-black py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  {language === "ar" ? "تسجيل الدخول" : "Login"}
                </button>
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-750 transition"
                >
                  {language === "ar" ? "إنشاء حساب" : "Sign Up"}
                </button>
              </div>

              <button
                onClick={() => setShowAuthModal(false)}
                className="w-full mt-4 text-gray-500 hover:text-gray-400 py-2 text-sm transition"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAIWarning && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg backdrop-blur-md animate-fade-in-out">
          {language === "ar"
            ? "⚠️ هذا التحليل من الذكاء الصناعي وقد يكون صواب أو خطأ."
            : "⚠️ This analysis is AI-generated and may be correct or incorrect."}
        </div>
      )}
    </div>
  );
}
