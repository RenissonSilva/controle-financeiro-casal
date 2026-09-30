import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { INPUT_CLASSES } from '@/Components/ui/Field';

// Input do Breeze no visual Sovinna (mesmas classes do ui/Field).
export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={`${INPUT_CLASSES} ${className}`}
            ref={localRef}
        />
    );
});
