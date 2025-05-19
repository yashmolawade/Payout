import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import UniversalLoader from "../components/common/UniversalLoader";

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");
  const loadingTimeoutRef = useRef(null);
  const minLoadingTimeRef = useRef(null);
  const loadingStartTimeRef = useRef(null);

  // Intercept console errors/warnings to prevent them from interfering with the loader
  useEffect(() => {
    // Save the original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Override console methods to prevent them from affecting the loader
    console.error = (...args) => {
      // Still log to console, but ensure it doesn't affect our loader
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
    };

    console.log = (...args) => {
      originalConsoleLog.apply(console, args);
    };

    // Cleanup on unmount
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    };
  }, []);

  const showLoader = (text = "Loading...") => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Set the loading start time
    loadingStartTimeRef.current = Date.now();

    setLoadingText(text);
    setIsLoading(true);

    // Set a minimum display time to prevent flickering
    minLoadingTimeRef.current = setTimeout(() => {
      minLoadingTimeRef.current = null;
    }, 600); // Minimum 600ms display time
  };

  const hideLoader = () => {
    // Clear the existing timeout first
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Check if we've displayed the loader for the minimum time
    const currentTime = Date.now();
    const loadingStartTime = loadingStartTimeRef.current || 0;
    const elapsedTime = currentTime - loadingStartTime;

    if (minLoadingTimeRef.current || elapsedTime < 600) {
      // If minimum display time hasn't been met, delay hiding
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        loadingTimeoutRef.current = null;
      }, Math.max(0, 600 - elapsedTime));
    } else {
      // Minimum display time has been met, hide immediately
      setIsLoading(false);
    }
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        showLoader,
        hideLoader,
        loadingText,
        setLoadingText,
      }}
    >
      {children}
      {isLoading && <UniversalLoader text={loadingText} />}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;
