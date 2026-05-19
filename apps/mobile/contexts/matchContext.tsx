import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useState,
} from 'react';

export type MatchContextType = {
  p1Score: number;
  p2Score: number;
  setP1Score: Dispatch<SetStateAction<number>>;
  setP2Score: Dispatch<SetStateAction<number>>;
  gameStarted: boolean;
  startGame: () => void;
  endGame: () => void;
  incrementScore: (setter: Dispatch<SetStateAction<number>>) => void;
  decrementScore: (setter: Dispatch<SetStateAction<number>>) => void;
};

const MatchContext = createContext<MatchContextType | undefined>(undefined);

const MatchProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Xp, setP1Xp] = useState(0);
  const [p2Xp, setP2Xp] = useState(0);

  const startGame = () => setGameStarted(true);
  const endGame = () => setGameStarted(false);

  const incrementScore = (setter: Dispatch<SetStateAction<number>>) => {
    setter((prev) => prev + 1);
  };

  const decrementScore = (setter: Dispatch<SetStateAction<number>>) => {
    setter((prev) => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <MatchContext.Provider
      value={{
        p1Score,
        p2Score,
        setP1Score,
        setP2Score,
        gameStarted,
        startGame,
        endGame,
        incrementScore,
        decrementScore,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
};

export const useMatch = () => {
  const context = useContext(MatchContext);
  if (!context) throw new Error('useMatch must be used within MatchProvider');
  return context;
};

export default MatchProvider;
