import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './pages/ProfilePage';
import { GamePage } from './pages/GamePage';
import { LoginPage } from './pages/LoginRegisterPage';
import { useAuth } from './providers/AuthProvider';
import { AnimationPage } from './pages/AnimationPage';
import { WelcomePage } from './pages/WelcomePage';
import { PlayAiPage } from './pages/PlayAiPage';
import TournamentRoutes from './router/TournamentRoutes';

const MeRedirect = () => {
  const { user, isAuthChecked } = useAuth();

  if (!isAuthChecked) {
    return null;
  }

  if (!user || !user.username) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/profile/${user.username}`} replace />;
};

export const App = () => {
  return (
    <main className="h-screen bd-slate-950 text-slate-100">
      <Routes>
        <Route path="/" element={<AnimationPage />}></Route>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/me" element={<MeRedirect />}></Route>
        <Route path="/game/local" element={<GamePage sessionId={null} />} />
        <Route path="/game/pong-ai" element={<PlayAiPage />} />
        <Route path="/profile/:username" element={<ProfilePage />}></Route>
        <Route path="/tournaments/*" element={<TournamentRoutes />} />
      </Routes>
    </main>
  );
};
