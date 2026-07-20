import ConfigScreen from './components/ConfigScreen';
import GameScreen from './components/GameScreen';
import ReportScreen from './components/ReportScreen';
import { useGame } from './state/gameHooks';

export default function App() {
  const state = useGame();
  if (state.phase === 'game') return <GameScreen />;
  if (state.phase === 'report') return <ReportScreen />;
  return <ConfigScreen />;
}
