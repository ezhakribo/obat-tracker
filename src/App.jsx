import React, { useState, useEffect } from "react";
import {
  Bell,
  Check,
  Clock,
  Calendar,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Pill,
  Droplet,
  Thermometer,
} from "lucide-react";

const MedTracker = () => {
  // --- STATE & CONFIG ---
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("schedule"); // 'schedule' or 'history'
  const [notificationPermission, setNotificationPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "default"
  );

  // Initial Data sesuai Resep Dokter
  const initialMeds = [
    {
      id: 1,
      name: "Pro TB 3",
      dosage: "2 Tablet",
      instruction: "Sebelum Makan",
      timeType: "fixed", // Waktu tetap
      defaultTimes: ["06:00"], // Jam 6 pagi (misal)
      icon: "pill",
      color: "bg-red-100 text-red-700 border-red-200",
      history: {},
    },
    {
      id: 2,
      name: "Sporetik Sirup",
      dosage: "2.5 ml",
      instruction: "Sesudah Makan (Tiap 12 jam)",
      timeType: "interval",
      intervalHours: 12,
      durationDays: 7,
      startDate: null, // User click start
      currentDay: 0,
      defaultTimes: ["08:00", "20:00"],
      icon: "bottle",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      history: {},
    },
    {
      id: 3,
      name: "Lasal Sirup",
      dosage: "3 ml",
      instruction: "Sesudah Makan (Max 20 hari)",
      timeType: "frequency",
      timesPerDay: 4,
      defaultTimes: ["08:00", "12:00", "16:00", "20:00"],
      maxDuration: 20,
      currentDay: 1,
      icon: "bottle",
      color: "bg-green-100 text-green-700 border-green-200",
      history: {},
    },
    {
      id: 4,
      name: "Disudrin Sirup",
      dosage: "1.5 ml",
      instruction: "Sesudah Makan (Saat Pilek)",
      timeType: "conditional", // Hanya jika aktif
      isActive: false, // Default mati, user nyalakan kalau pilek
      timesPerDay: 3,
      defaultTimes: ["08:00", "14:00", "20:00"],
      icon: "bottle",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      history: {},
    },
    {
      id: 5,
      name: "Teorol Drop",
      dosage: "3 Tetes",
      instruction: "Pagi - Sesudah Makan",
      timeType: "fixed",
      defaultTimes: ["09:00"],
      icon: "drop",
      color: "bg-purple-100 text-purple-700 border-purple-200",
      history: {},
    },
    {
      id: 6,
      name: "Imunped Sirup",
      dosage: "2.5 ml",
      instruction: "Pagi - Sesudah Makan",
      timeType: "fixed",
      defaultTimes: ["09:00"],
      icon: "bottle",
      color: "bg-orange-100 text-orange-700 border-orange-200",
      history: {},
    },
  ];

  // Load from local storage or use initial
  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem("myMedsData_v2");
    return saved ? JSON.parse(saved) : initialMeds;
  });

  // Save to local storage whenever meds change
  useEffect(() => {
    localStorage.setItem("myMedsData_v2", JSON.stringify(meds));
  }, [meds]);

  // Clock Ticker & Notification Checker
  useEffect(() => {
    const checkNotifications = (now) => {
      const timeString = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const todayKey = now.toISOString().split("T")[0];

      meds.forEach((med) => {
        // Skip if logic applies
        if (med.timeType === "conditional" && !med.isActive) return;
        if (med.startDate && med.currentDay > med.durationDays) return;

        if (med.defaultTimes.includes(timeString)) {
          // Check if already taken today at this time (simple check)
          const hasTaken = med.history[todayKey]?.includes(timeString);

          if (!hasTaken && notificationPermission === "granted") {
            new Notification(`Waktunya Minum Obat!`, {
              body: `${med.name} - ${med.dosage} (${med.instruction})`,
              icon: "/icon.png", // Fallback icon
            });
          }
        }
      });
    };

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      checkNotifications(now);
    }, 60000); // Check every minute



    return () => clearInterval(timer);
  }, [meds, notificationPermission]);

  const requestNotification = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };



  // --- ACTIONS ---

  const takeMedication = (medId, scheduledTime) => {
    const now = new Date();
    const todayKey = now.toISOString().split("T")[0];
    const actualTime = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    setMeds((prevMeds) =>
      prevMeds.map((med) => {
        if (med.id !== medId) return med;

        const prevHistory = med.history[todayKey] || [];
        // Prevent double logging for same slot instantly
        if (prevHistory.includes(scheduledTime)) return med;

        let newMedState = {
          ...med,
          history: {
            ...med.history,
            [todayKey]: [
              ...prevHistory,
              { scheduled: scheduledTime, takenAt: actualTime },
            ],
          },
        };

        // Logic khusus untuk tracking durasi/hari
        if (med.id === 2 && !med.startDate) {
          newMedState.startDate = todayKey;
          newMedState.currentDay = 1;
        }

        return newMedState;
      })
    );
  };

  const toggleConditional = (medId) => {
    setMeds((prevMeds) =>
      prevMeds.map((med) => {
        if (med.id === medId) return { ...med, isActive: !med.isActive };
        return med;
      })
    );
  };

  const resetProgress = (medId) => {
    if (!confirm("Reset progress obat ini?")) return;
    setMeds((prevMeds) =>
      prevMeds.map((med) => {
        if (med.id === medId)
          return { ...med, startDate: null, currentDay: 0, history: {} };
        return med;
      })
    );
  };

  // --- RENDER HELPERS ---

  const getTodayLog = (med) => {
    const todayKey = currentTime.toISOString().split("T")[0];
    return med.history[todayKey] || [];
  };

  const isTaken = (med, timeSlot) => {
    const logs = getTodayLog(med);
    return logs.some((log) => log.scheduled === timeSlot);
  };

  const getIcon = (type) => {
    switch (type) {
      case "pill":
        return <Pill className="w-6 h-6" />;
      case "bottle":
        return <Droplet className="w-6 h-6" />;
      case "drop":
        return <Droplet className="w-6 h-6" />;
      default:
        return <Bell className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      {/* HEADER */}
      <header className="bg-teal-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">ObatKu</h1>
          {notificationPermission !== "granted" && (
            <button
              onClick={requestNotification}
              className="bg-teal-700 p-2 rounded-full hover:bg-teal-800"
            >
              <Bell className="w-5 h-5 text-yellow-300 animate-pulse" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2 opacity-90">
          <Clock className="w-4 h-4" />
          <p className="text-lg font-medium">
            {currentTime.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            <span className="text-sm ml-2 font-normal opacity-75">
              {currentTime.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-4 max-w-md mx-auto space-y-6">
        {/* TABS */}
        <div className="flex p-1 bg-gray-200 rounded-xl">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "schedule"
                ? "bg-white shadow text-teal-700"
                : "text-gray-500"
            }`}
          >
            Jadwal Hari Ini
          </button>
          <button
            onClick={() => setActiveTab("meds")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "meds"
                ? "bg-white shadow text-teal-700"
                : "text-gray-500"
            }`}
          >
            Daftar Obat
          </button>
        </div>

        {activeTab === "schedule" && (
          <div className="space-y-4">
            {meds.map((med) => {
              // Logic to show/hide based on conditions
              if (med.timeType === "conditional" && !med.isActive) return null;
              if (med.durationDays && med.startDate) {
                // Calculate days passed
                const start = new Date(med.startDate);
                const diffTime = Math.abs(currentTime - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > med.durationDays) return null; // Expired
              }

              return (
                <div
                  key={med.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
                    med.color.replace("bg-", "border-").split(" ")[2]
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          med.color.split(" ")[0]
                        }`}
                      >
                        {getIcon(med.icon)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">
                          {med.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {med.dosage} • {med.instruction}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Grid */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {med.defaultTimes.map((time, idx) => {
                      const taken = isTaken(med, time);
                      return (
                        <button
                          key={idx}
                          disabled={taken}
                          onClick={() => takeMedication(med.id, time)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 ${
                            taken
                              ? "bg-teal-50 border-teal-200 text-teal-700 opacity-60"
                              : "bg-gray-50 border-gray-200 hover:border-teal-400"
                          }`}
                        >
                          <span className="text-xs font-bold mb-1">{time}</span>
                          {taken ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <span className="text-xs text-teal-600 font-semibold">
                              AMBIL
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer Info for Specific Meds */}
                  {med.id === 2 && med.startDate && (
                    <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-center">
                      <Calendar className="w-3 h-3 mr-1" /> Hari ke-
                      {Math.ceil(
                        Math.abs(currentTime - new Date(med.startDate)) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      dari 7
                    </div>
                  )}
                  {med.id === 3 && (
                    <div className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Maksimal 20 hari
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty State Helper */}
            {meds.every((m) => m.timeType === "conditional" && !m.isActive) && (
              <div className="text-center p-8 text-gray-400">
                <p>Tidak ada jadwal aktif saat ini.</p>
                <p className="text-sm">
                  Aktifkan obat (seperti Disudrin) di tab Daftar Obat jika
                  diperlukan.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "meds" && (
          <div className="space-y-4">
            {meds.map((med) => (
              <div
                key={med.id}
                className="bg-white rounded-xl p-4 shadow-sm flex flex-col space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${med.color.split(" ")[0]}`}
                    >
                      {getIcon(med.icon)}
                    </div>
                    <div>
                      <h4 className="font-bold">{med.name}</h4>
                      <p className="text-xs text-gray-500">{med.dosage}</p>
                    </div>
                  </div>

                  {/* Conditional Toggle for Disudrin */}
                  {med.timeType === "conditional" && (
                    <button
                      onClick={() => toggleConditional(med.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
                        med.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {med.isActive ? (
                        <>
                          <Play className="w-3 h-3 mr-1" /> Aktif (Pilek)
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3 mr-1" /> Stop
                        </>
                      )}
                    </button>
                  )}

                  {/* Reset for Duration Meds */}
                  {med.durationDays && (
                    <button
                      onClick={() => resetProgress(med.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <span className="font-semibold">Aturan:</span>{" "}
                  {med.instruction}
                  <br />
                  <span className="font-semibold">Jadwal:</span>{" "}
                  {med.defaultTimes.join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB - Quick Add (Mockup functionality for now) */}
      <button
        onClick={() =>
          alert(
            "Fitur edit jadwal akan tersedia di update berikutnya. Saat ini gunakan jadwal standar dokter."
          )
        }
        className="fixed bottom-6 right-6 bg-teal-600 text-white p-4 rounded-full shadow-lg hover:bg-teal-700 transition-transform hover:scale-110 active:scale-95"
      >
        <Clock className="w-6 h-6" />
      </button>
    </div>
  );
};

export default MedTracker;
