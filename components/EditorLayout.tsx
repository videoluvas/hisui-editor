import { ReactNode } from "react";
import ProjectPanel from "./ProjectPanel";

type EditorLayoutProps = {
  children: ReactNode;
};

export default function EditorLayout({ children }: EditorLayoutProps) {
  return (
    <div className="editor-layout">
      <ProjectPanel />
      <main className="editor-main">{children}</main>
    </div>
  );
}