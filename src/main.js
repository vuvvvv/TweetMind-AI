import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Globe, User, LogOut } from "lucide-react";
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
  const API_BASE = "http://localhost:8080";

  
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

  
const handleAIResponse = async (text) => {
  let displayed = "";

  for (let i = 0; i < text.length; i++) {
    displayed += text[i];
    await new Promise((r) => setTimeout(r, 15));

    setChatHistory((prev) => {
      const last = [...prev];
      last[last.length - 1].content = displayed;
      return last;
    });

    
    if (autoScroll) {
      const el = chatContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }
};
  const handleSignup = async () => {
    setLoading(true);
    setAuthError("");

 
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
      setMessage(`✅ ${data.message}`);
    } catch (err) {
      setAuthError(
        language === "ar" ? "هذا البريد مستخدم بالفعل" : "Email already exists"
      );
    } finally {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message);
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
      setMessage(
        language === "ar"
          ? "❌ لقد وصلت إلى الحد اليومي (رسالتين فقط). حاول غدًا!"
          : "❌ You've reached your daily limit of 2 messages. Try again tomorrow!"
      );
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
      const res = await fetch(`${API_BASE}/fetch-analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: input, lan: language }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        
        throw new Error(text);
      }

      if (!res.ok)
        throw new Error(data.error || data.message || "Unknown error");

      setChatHistory((prev) => [...prev, { role: "assistant", content: "" }]);
      await handleAIResponse(data.result);
      setShowAIWarning(true);
      setTimeout(() => setShowAIWarning(false), 3000);
      setDailyCount((prev) => prev + 1);
    } catch (err) {
      const errorText =
        language === "ar"
          ? `🤖 ${
              err.message.includes("No tweets")
                ? "لم أجد أي تغريدات لتحليل هذا الحساب."
                : err.message.includes("Username")
                ? "هذا الحساب غير موجود أو لا يمكن الوصول إليه."
                : err.message.includes("limit")
                ? "لقد تجاوزت الحد اليومي، حاول لاحقًا."
                : "حدث خطأ أثناء التحليل، حاول مجددًا."
            }`
          : `🤖 ${
              err.message.includes("No tweets")
                ? "I couldn’t find any tweets for this account."
                : err.message.includes("Username")
                ? "This account doesn't exist or isn't accessible."
                : err.message.includes("limit")
                ? "You've reached your daily limit. Try again later."
                : "An error occurred during analysis. Please try again."
            }`;

      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: errorText },
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
      {/* 3D Avatar */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <Avatar3D />
      </div>

      {/* Header */}
      <div className="  sticky top-0 z-50 ">
        <div className="w-full px-6 py-4 flex items-center justify-between  relative z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br  rounded-lg flex items-center justify-center">
              <img
                src="/icon.png"
                alt="Logo"
                className="w-9 h-9 object-contain"
              />
            </div>
            <h1 className="text-xl font-semibold text-left ml-0">
              {language === "ar" ? "TweetMind AI " : "TweetMind AI"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition"
            >
              <Globe size={18} />
             
            </button>

            {/* Account Menu */}

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
                        <p className="text-xs text-gray-500">
                          {dailyCount}
                          {language === "ar" ? "/2 رسائل" : "/2 messages"}
                        </p>
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

      {/* Chat Area */}
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
                    <div className="ml-auto flex items-end gap-2 max-w-[70%]">
                      <div className="bg-blue-600/80 text-white px-4 py-2 rounded-2xl whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 max-w-[70%]">
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

      {/* Error / Info */}
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

      {/* Input */}
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

      {/* Auth Modal */}
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
                <p className="text-red-400 text-sm text-center mt-3">
                  {authError}
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

      {/* AI Warning */}
      {showAIWarning && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2  text-white  px-4 py-2 rounded-lg text-sm z-50 animate-fade-in-out">
          {language === "ar"
            ? "⚠️ هذا التحليل من الذكاء الصناعي وقد يكون صواب أو خطأ."
            : "⚠️ This analysis is AI-generated and may be correct or incorrect."}
        </div>
      )}
    </div>
  );
};  
