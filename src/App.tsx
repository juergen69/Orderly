import { useState } from 'react';
import { TickerHost } from './features/TickerHost';
import { ProjectsSidebar } from './features/projects/ProjectsSidebar';
import { Board } from './features/board/Board';
import { store } from './store/storeInstance';
import styles from './App.module.css';

function App() {
  const projects = store((s) => s.projects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const selectedProject =
    selectedProjectId === null
      ? null
      : projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className={styles.shell}>
      <header className={styles.banner} role="banner">
        <h1 className={styles.title}>Orderly</h1>
        <span className={styles.filterLabel}>
          {selectedProject === null ? 'All projects' : selectedProject.name}
        </span>
      </header>

      <div className={styles.body}>
        <ProjectsSidebar
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        <main className={styles.main}>
          <section className={styles.boardRegion} aria-label="Board" role="region">
            <Board filterProjectId={selectedProjectId} />
          </section>
        </main>
      </div>

      <TickerHost />
    </div>
  );
}

export default App;
