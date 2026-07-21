import ConfigScreen from './components/ConfigScreen';
import GameScreen from './components/GameScreen';
import { InstallBanner } from './components/InstallBanner';
import ReportScreen from './components/ReportScreen';
import { useGame } from './state/gameHooks';

export default function App() {
  const state = useGame();
  if (state.phase === 'game') return <GameScreen />;
  return (
    <>
      <InstallBanner />
      {state.phase === 'report' ? <ReportScreen /> : <ConfigScreen />}
    </>
  );
}
