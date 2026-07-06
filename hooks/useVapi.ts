"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ASSISTANT_ID, DEFAULT_VOICE, VOICE_SETTINGS } from "@/lib/constants";
import { IBook, Messages } from "@/types";
import { endVoiceSesion, startVoiceSesion } from "@/lib/actions/session.actions";
import Vapi from "@vapi-ai/web"
import { title } from "process";
import { formatDuration, getVoice } from "@/lib/utils";
import { get } from "http";

export type CallStatus = "idle" | "starting" | "connecting" | "error" | "listening" | "speaking" | "thinking";

export const useLatestRef = <T>(value: T) => {
    const ref = useRef(value);
    useEffect(() => {
        ref.current = value;
    }, [value])
    return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY;
let vapi: InstanceType<typeof Vapi>

function getVapi() {
    if (!vapi) {
        if (!VAPI_API_KEY) {
            throw new Error("NEXT_PUBLIC_VAPI_API_KEY not found. Please set in the.env file.")
        }
        vapi = new Vapi(VAPI_API_KEY);

    }
    return vapi;
}

export const useVapi = (book: IBook) => {


    const { userId } = useAuth();
    const [status, setStatus] = useState<CallStatus>("idle");
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [currentUserMessage, setCurrentUserMessage] = useState("");
    const [duration, setDuration] = useState(0);
    const [maxDurationSeconds, setMaxDurationSeconds] = useState<number | null>(null);
    const [limitError, setLimitError] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const isStoppingRef = useRef<boolean>(false);
    const isStartingRef = useRef<boolean>(false);

    const bookRef = useLatestRef(book);
    const maxDurationRef = useLatestRef(maxDurationSeconds);
    const voice = book.persona || DEFAULT_VOICE;


    const isActive = status === "connecting" || status === "listening" || status === "speaking" || status === "thinking" || status === "starting";

    const stop = async () => {
        if (isStoppingRef.current) return;
        isStoppingRef.current = true;
        try {
            await getVapi().stop();

            if (sessionIdRef.current) {
                await endVoiceSesion(sessionIdRef.current, duration);
                sessionIdRef.current = null;
            }

            setStatus("idle");
        } finally {
            isStoppingRef.current = false;
        }
    }
    const stopRef = useLatestRef(stop);

    const appendMessage = useCallback((message: Messages) => {
        setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === message.role && last.content === message.content) {
                return prev;
            }
            return [...prev, message];
        });
    }, []);

    useEffect(() => {
        let vapiInstance: InstanceType<typeof Vapi>;
        try {
            vapiInstance = getVapi();
        } catch (e) {
            console.error("Error initializing Vapi", e);
            return;
        }

        const handleMessage = (rawMessage: unknown) => {
            const message = rawMessage as {
                type?: string;
                role?: "user" | "assistant";
                transcriptType?: "partial" | "final";
                transcript?: string;
            };
            if (message.type !== "transcript") return;

            const { role, transcriptType, transcript = "" } = message;

            if (role === "user") {
                if (transcriptType === "partial") {
                    setCurrentUserMessage(transcript);
                } else if (transcriptType === "final") {
                    setCurrentUserMessage("");
                    setStatus("thinking");
                    appendMessage({ role, content: transcript });
                }
                return;
            }

            if (role === "assistant") {
                if (transcriptType === "partial") {
                    setCurrentMessage(transcript);
                } else if (transcriptType === "final") {
                    setCurrentMessage("");
                    setStatus("listening");
                    appendMessage({ role, content: transcript });
                }
            }
        };

        const handleCallStart = () => {
            setDuration(0);
            if (timerRef.current) clearInterval(timerRef.current);
            let elapsed = 0;
            timerRef.current = setInterval(() => {
                elapsed += 1;
                setDuration(elapsed);
                const max = maxDurationRef.current;
                if (max !== null && elapsed >= max) {
                    setLimitError(`You've reached the ${formatDuration(max)} limit for your plan.`);
                    stopRef.current();
                }
            }, 1000);
        };

        const handleCallEnd = () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };

        const handleSpeechStart = () => setStatus("speaking");
        const handleSpeechEnd = () => setStatus("listening");

        vapiInstance.on("message", handleMessage);
        vapiInstance.on("call-start", handleCallStart);
        vapiInstance.on("call-end", handleCallEnd);
        vapiInstance.on("speech-start", handleSpeechStart);
        vapiInstance.on("speech-end", handleSpeechEnd);

        return () => {
            vapiInstance.removeListener("message", handleMessage);
            vapiInstance.removeListener("call-start", handleCallStart);
            vapiInstance.removeListener("call-end", handleCallEnd);
            vapiInstance.removeListener("speech-start", handleSpeechStart);
            vapiInstance.removeListener("speech-end", handleSpeechEnd);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [appendMessage, maxDurationRef, stopRef]);

    const start = async () => {
        if (isStartingRef.current || isActive) return;
        if (!userId) {
            return setLimitError("Please login to start a conversation");
        }
        isStartingRef.current = true;
        setLimitError(null);
        setStatus("connecting");
        try {
            const result = await startVoiceSesion(book._id);

            if (!result.success) {
                setLimitError(result.error || "Session limit reached. Please ugrade your plan."
                )
                setStatus("idle");
                return
            }
            sessionIdRef.current = result.sessionId || null;
            setMaxDurationSeconds(result.maxDurationSeconds);
            const firstMessage = `Hey, good to meet you. Quick question, before we dive in: have you actually read ${book.title} yet? Or are we starting fresh?`
            await getVapi().start(ASSISTANT_ID, {
                firstMessage,
                variableValues: {
                    title: book.title,
                    author: book.author,
                    bookId: book._id
                },
                voice: {
                    provider: "11labs",
                    voiceId: getVoice(voice).id,
                    model: "eleven_turbo_v2_5" as const,
                    stability: VOICE_SETTINGS.stability,
                    similarityBoost: VOICE_SETTINGS.similarityBoost,
                    style: VOICE_SETTINGS.style,
                    useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost
                }
            })
        }
        catch (e) {
            console.error("Error starting call.", e);
            setStatus("idle");
            setLimitError("An error occured while starting the call");

        }
        finally {
            isStartingRef.current = false;
        }

    }
    const clearErrors = () => {
        setLimitError(null);
    }

    return {
        status, isActive, messages, currentMessage, currentUserMessage, duration, maxDurationSeconds, limitError, start, stop, clearErrors
    }


}
export default useVapi
