export default function ProgressBar({ value = 0 }) {
    return (
        <div className="h-2 overflow-hidden rounded-full bg-text/8">
            <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-progress-grad-start to-progress-grad-end [animation:riseBar_1s_cubic-bezier(.2,.8,.2,1)]"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}
