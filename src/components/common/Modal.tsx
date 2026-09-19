import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const sizeMap = {
  sm: "w-[95%] max-w-[480px]!",
  md: "w-[95%] max-w-[740px]!",
  lg: "w-[95%] lg:max-w-[1000px]",
  xl: "w-[95%] max-w-[1600px]!",
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  size?: keyof typeof sizeMap;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "sm",
  children,
  className = "",
}: ModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="modal-container"
        className={`${sizeMap[size]} max-h-[90vh] max-w-full flex flex-col ${className}`}
      >
        <div data-testid="modal-box" className="hidden" />
        {(title || description) && (
          <DialogHeader>
            {title &&
              (typeof title === "string" ? (
                <DialogTitle className="font-semibold text-primary">
                  {title}
                </DialogTitle>
              ) : (
                <div className="font-semibold flex gap-2 items-center text-primary">
                  {title}
                </div>
              ))}
            {description && (
              <DialogDescription>
                {typeof description === "string" ? (
                  description
                ) : (
                  <>{description}</>
                )}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
