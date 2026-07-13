import { ReactNode } from "react";
import SidePanel from "./SidePanel";

type EditorLayoutProps = {
  children: ReactNode;
};

export default function EditorLayout({ children }: EditorLayoutProps) {
  return (
    <div className="editor-layout">
      <SidePanel />
      <main className="editor-main">{children}</main>
    </div>
  );
}