import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
const Context = createContext({
  open: false,
  onOpenChange: (_v: boolean) => {},
  title: "",
  description: "",
});
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Context.Provider
      value={{
        open,
        onOpenChange,
        title: `${id}-title`,
        description: `${id}-description`,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function DialogContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const c = useContext(Context);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (c.open && !ref.current?.open) ref.current?.showModal();
    else if (!c.open && ref.current?.open) ref.current.close();
  }, [c.open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={c.title}
      aria-describedby={c.description}
      onCancel={(e) => {
        e.preventDefault();
        c.onOpenChange(false);
      }}
      className={`fixed m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-background text-foreground p-6 shadow-xl backdrop:bg-black/60 ${className}`}
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute top-3 right-4 text-xl"
        onClick={() => c.onOpenChange(false)}
      >
        ×
      </button>
      {children}
    </dialog>
  );
}
export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-5 pr-6 space-y-2">{children}</div>;
}
export function DialogTitle({ children }: { children: ReactNode }) {
  const c = useContext(Context);
  return (
    <h2 id={c.title} className="text-xl font-bold">
      {children}
    </h2>
  );
}
export function DialogDescription({ children }: { children: ReactNode }) {
  const c = useContext(Context);
  return (
    <p id={c.description} className="text-sm text-muted-foreground break-all">
      {children}
    </p>
  );
}
