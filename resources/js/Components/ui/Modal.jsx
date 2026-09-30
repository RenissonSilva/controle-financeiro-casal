import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';

const MAX_WIDTH = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
};

export default function Modal({
    children,
    show = false,
    title,
    maxWidth = 'md',
    closeable = true,
    onClose = () => {},
}) {
    const close = () => {
        if (closeable) onClose();
    };

    return (
        <Transition show={show} leave="duration-150">
            <Dialog as="div" className="fixed inset-0 z-50 flex items-center overflow-y-auto px-4 py-6" onClose={close}>
                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-bg/80" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-200"
                    enterFrom="opacity-0 translate-y-4 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:scale-95"
                >
                    <DialogPanel
                        className={`relative mx-auto w-full transform overflow-hidden rounded-2xl border border-line bg-surface p-6 text-text transition-all ${MAX_WIDTH[maxWidth]}`}
                    >
                        {title && (
                            <DialogTitle className="mb-5 text-[15px] font-semibold">{title}</DialogTitle>
                        )}
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
