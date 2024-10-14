import React from "react";
import "styles/global.css";
import "util/analytics";
import Chat from "components/Chat";
import { AuthProvider } from "util/auth";
import { QueryClientProvider } from "util/db";
import 'react-toastify/dist/ReactToastify.css';

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider>
      <AuthProvider>
        <Chat />
        <Component {...pageProps} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
