
"use client";
import Transcript from '@/components/Transcript';
import useVapi, { CallStatus } from '@/hooks/useVapi';
import { IBook } from '@/types';
import { formatDuration, getVoice } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react'
import Image from 'next/image';
import React, { useEffect } from 'react'
import { toast } from 'sonner';

const STATUS_DISPLAY: Record<CallStatus, { label: string; dotClass: string }> = {
    idle: { label: "Ready", dotClass: "vapi-status-dot-ready" },
    starting: { label: "Starting…", dotClass: "vapi-status-dot-connecting" },
    connecting: { label: "Connecting…", dotClass: "vapi-status-dot-connecting" },
    listening: { label: "Listening", dotClass: "vapi-status-dot-listening" },
    thinking: { label: "Thinking…", dotClass: "vapi-status-dot-thinking" },
    speaking: { label: "Speaking", dotClass: "vapi-status-dot-speaking" },
    error: { label: "Error", dotClass: "vapi-status-dot-ready" },
};

const VapiControls = ({ book }: { book: IBook }) => {

    const { status, isActive, messages, currentMessage, currentUserMessage, duration, maxDurationSeconds, limitError, start, stop, clearErrors } = useVapi(book);
    const isAiBusy = status === "speaking" || status === "thinking";
    const statusDisplay = STATUS_DISPLAY[status];
    const voiceName = getVoice(book.persona).name;

    useEffect(() => {
        if (!limitError) return;
        toast.error(limitError);
        clearErrors();
    }, [limitError, clearErrors]);
    return (
        <>
            <section className="vapi-header-card w-full">
                <div className="vapi-cover-wrapper">
                    <Image
                        src={book.coverURL}
                        alt={book.title}
                        width={130}
                        height={195}
                        className="vapi-cover-image"
                    />
                    <div className="vapi-mic-wrapper">
                        {isAiBusy && <span className="vapi-pulse-ring" />}
                        <button
                            onClick={isActive ? stop : start}
                            disabled={status === "connecting"}
                            type="button"
                            className={`vapi-mic-btn ${isActive ? "vapi-mic-btn-active" : "vapi-mic-btn-inactive"}`}
                            aria-label={isActive ? "Stop conversation" : "Start conversation"}
                        >
                            {isActive ? (
                                <Mic className="size-6 text-[#212a3b]" />
                            ) : (
                                <MicOff className="size-6 text-[#212a3b]" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
                    <div>
                        <h1 className="font-serif text-2xl font-bold leading-tight text-black md:text-3xl">
                            {book.title}
                        </h1>
                        <p className="mt-1 text-lg text-[#6f6a62]">by {book.author}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="vapi-status-indicator">
                            <span className={`vapi-status-dot ${statusDisplay.dotClass}`} />
                            <span className="vapi-status-text">{statusDisplay.label}</span>
                        </div>
                        <div className="vapi-status-indicator">
                            <span className="vapi-status-text">Voice: {voiceName}</span>
                        </div>
                        <div className="vapi-status-indicator">
                            <span className="vapi-status-text">
                                {formatDuration(duration)}
                                {maxDurationSeconds !== null ? `/${formatDuration(maxDurationSeconds)}` : ""}
                            </span>
                        </div>
                    </div>
                </div>
            </section >
            <div className="vapi-transcript-wrapper">
                <Transcript
                    messages={messages}
                    currentMessage={currentMessage}
                    currentUserMessage={currentUserMessage}
                />
            </div>
        </>

    )
}

export default VapiControls
