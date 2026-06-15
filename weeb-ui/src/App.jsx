import AppRouter from './routes/AppRouter';
import PwaManager from './components/pwa/PwaManager';
import ModernPreloader from './components/feedback/ModernPreloader';

function App() {
  return (
    <>
      <ModernPreloader />
      <AppRouter />
      <PwaManager />
    </>
  );
}

export default App;
