import { useState } from 'react';
import { TickerHost } from './features/TickerHost';
import { ProjectsSidebar } from './features/projects/ProjectsSidebar';
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
      </header>

      <div className={styles.body}>
        <ProjectsSidebar
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        <main className={styles.main}>
          <section className={styles.placeholder} aria-label="Board" role="region">
            <p>
              {selectedProject === null
                ? 'Showing all projects.'
                : `Filtered to "${selectedProject.name}".`}
            </p>
            <p className={styles.hint}>The board arrives in a later step.</p>
          </section>
        </main>
      </div>

      <TickerHost />
    </div>
  );
}

export default App;
