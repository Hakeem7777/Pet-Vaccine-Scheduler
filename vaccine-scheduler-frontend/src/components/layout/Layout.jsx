import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveAds } from '../../api/advertisements';
import Header from './Header';
import Footer from './Footer';
import AdBanner from '../ads/AdBanner';
import ChatBubble from '../chat/ChatBubble';
import ChatWindow from '../chat/ChatWindow';
import GuidedTour from '../tour/GuidedTour';

function Layout() {
  const { hasAiChat, hasNoAds, isAdmin, isLoading } = useAuth();
  const [ads, setAds] = useState([]);
  const hideAds = hasNoAds || isAdmin;

  useEffect(() => {
    if (isLoading) return;
    if (!hideAds) {
      getActiveAds()
        .then(setAds)
        .catch(() => setAds([]));
    }
  }, [isLoading, hideAds]);

  return (
    <div className="app-layout">
      <Header />
      {!hideAds && <AdBanner ads={ads} position="top" />}
      <main className="main-content">
        <Outlet />
      </main>
      {!hideAds && <AdBanner ads={ads} position="bottom" />}
      {!hideAds && <AdBanner ads={ads} position="left" />}
      {!hideAds && <AdBanner ads={ads} position="right" />}
      <Footer />
      {hasAiChat && (
        <>
          <ChatBubble />
          <ChatWindow />
        </>
      )}
      <GuidedTour />
    </div>
  );
}

export default Layout;
