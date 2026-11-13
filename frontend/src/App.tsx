import React, { useState, useEffect } from "react";
import { HomePage } from "./pages/HomePage";
import { AdminPage } from "./pages/AdminPage";

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname + window.location.hash
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash);
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const isAdminRoute =
    currentPath.startsWith("/admin") ||
    currentPath.includes("#admin") ||
    window.location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <AdminPage />;
  }

  return <HomePage />;
};

export default App;
