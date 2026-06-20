import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

const HIDDEN_ISSUE_KEYS = "hiddenIssueKeys";
const HIDDEN_PROJECTS = "hiddenProjects";

const useHiddenIssues = () => {
  const [hiddenIssueKeys, setHiddenIssueKeys] = useState<string[]>([]);
  const [hiddenProjects, setHiddenProjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([LocalStorage.getItem(HIDDEN_ISSUE_KEYS), LocalStorage.getItem(HIDDEN_PROJECTS)])
      .then(([keys, projects]) => {
        setHiddenIssueKeys(keys ? JSON.parse(keys as string) : []);
        setHiddenProjects(projects ? JSON.parse(projects as string) : []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persistKeys = (keys: string[]) => {
    setHiddenIssueKeys(keys);
    return LocalStorage.setItem(HIDDEN_ISSUE_KEYS, JSON.stringify(keys));
  };

  const persistProjects = (projects: string[]) => {
    setHiddenProjects(projects);
    return LocalStorage.setItem(HIDDEN_PROJECTS, JSON.stringify(projects));
  };

  return {
    isLoading,
    hiddenIssueKeys,
    hiddenProjects,

    isHiddenIssue: (key: string) => hiddenIssueKeys.includes(key),
    isHiddenProject: (project: string) => hiddenProjects.includes(project),

    hideIssue: (key: string) => {
      if (!hiddenIssueKeys.includes(key)) return persistKeys([...hiddenIssueKeys, key]);
    },
    unhideIssue: (key: string) => persistKeys(hiddenIssueKeys.filter(k => k !== key)),

    hideProject: (project: string) => {
      if (!hiddenProjects.includes(project)) return persistProjects([...hiddenProjects, project]);
    },
    unhideProject: (project: string) => persistProjects(hiddenProjects.filter(p => p !== project)),
  };
};

export default useHiddenIssues;
