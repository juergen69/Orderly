import { useEffect, useState } from 'react';
import { TickerHost } from './features/TickerHost';
import { ProjectsSidebar } from './features/projects/ProjectsSidebar';
import { Board } from './features/board/Board';
import { CalendarView } from './features/calendar/CalendarView';
import { FocusPanel } from './features/focus-135/FocusPanel';
import { FocusAreas } from './features/focus-areas/FocusAreas';
import { SearchBar } from './features/search/SearchBar';
import { TagsSidebar } from './features/tags/TagsSidebar';
import { CommandPalette } from './features/command-palette/CommandPalette';
import { ImportExport } from './features/io/ImportExport';
import { TodoDetail } from './features/todo-detail/TodoDetail';
import { store } from './store/storeInstance';
import styles from './App.module.css';

function App() {
  const projects = store((s) => s.projects);
  const todos = store((s) => s.todos);
  const activeView = store((s) => s.ui.activeView);
  const setActiveView = store((s) => s.setActiveView);
  const selectedProjectId = store((s) => s.ui.selectedProjectId);
  const setSelectedProjectId = store((s) => s.setSelectedProjectId);
  const sidebarOpen = store((s) => s.ui.sidebarOpen);
  const setSidebarOpen = store((s) => s.setSidebarOpen);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Close mobile sidebar on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sidebarOpen, setSidebarOpen]);

  // Cmd/Ctrl+K toggles the command palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectedProject =
    selectedProjectId === null
      ? null
      : projects.find((p) => p.id === selectedProjectId) ?? null;

  // Close the detail panel if its todo no longer exists.
  const openTodoExists = openTodoId !== null && todos.some((t) => t.id === openTodoId);
  const activeTodoId = openTodoExists ? openTodoId : null;

  return (
    <div className={styles.shell}>
      <header className={styles.banner} role="banner">
        <h1 className={styles.title}>Orderly</h1>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open projects"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span className={styles.filterLabel}>
          {selectedProject === null ? 'All projects' : selectedProject.name}
        </span>
        <SearchBar />
        <ImportExport />
        <button
          type="button"
          className={styles.paletteButton}
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => setPaletteOpen(true)}
        >
          ⌘K
        </button>
        <div className={styles.viewSwitch} role="group" aria-label="View">
          <button
            type="button"
            className={styles.viewButton}
            aria-pressed={activeView === 'board'}
            data-active={activeView === 'board' || undefined}
            onClick={() => setActiveView('board')}
          >
            Board
          </button>
          <button
            type="button"
            className={styles.viewButton}
            aria-pressed={activeView === 'calendar'}
            data-active={activeView === 'calendar' || undefined}
            onClick={() => setActiveView('calendar')}
          >
            Calendar
          </button>
          <button
            type="button"
            className={styles.viewButton}
            aria-pressed={activeView === 'focus'}
            data-active={activeView === 'focus' || undefined}
            onClick={() => setActiveView('focus')}
          >
            Focus
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <ProjectsSidebar
          selectedProjectId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />

        {sidebarOpen && (
          <ProjectsSidebar
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            drawer
            onClose={() => setSidebarOpen(false)}
          />
        )}

        <TagsSidebar />

        <main className={styles.main}>
          {activeView === 'board' ? (
            <section className={styles.boardRegion} aria-label="Board" role="region">
              <Board filterProjectId={selectedProjectId} onOpenTodo={setOpenTodoId} />
            </section>
          ) : activeView === 'calendar' ? (
            <section className={styles.boardRegion} aria-label="Calendar" role="region">
              <CalendarView onOpenTodo={setOpenTodoId} />
            </section>
          ) : (
            <section className={styles.boardRegion} aria-label="Focus" role="region">
              <FocusPanel onOpenTodo={setOpenTodoId} />
              <FocusAreas />
            </section>
          )}
        </main>

        {activeTodoId !== null && (
          <TodoDetail todoId={activeTodoId} onClose={() => setOpenTodoId(null)} />
        )}
      </div>

      {sidebarOpen && <div className={styles.backdrop} data-visible onClick={() => setSidebarOpen(false)} />}

      <TickerHost />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default App;
