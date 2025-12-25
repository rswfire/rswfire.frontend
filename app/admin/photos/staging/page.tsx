"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { api } from "@/lib/api";

interface Photo {
    ulid: string;
    path: string;
    filename: string;
    url: string;
    size: number;
}

interface Decision {
    ulid: string;
    action: "approve" | "reject" | null;
    context: string;
    visibility: "public" | "sanctum" | "private";
}

function StagingContent() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [decisions, setDecisions] = useState<Record<string, Decision>>({});
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [totalRemaining, setTotalRemaining] = useState(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        try {
            setLoading(true);
            const data = await api.getStagingPhotos();
            setPhotos(data.photos);
            setTotalRemaining(data.total_remaining);

            const initialDecisions: Record<string, Decision> = {};
            data.photos.forEach((photo: Photo) => {
                initialDecisions[photo.ulid] = {
                    ulid: photo.ulid,
                    action: null,
                    context: "",
                    visibility: "public",
                };
            });
            setDecisions(initialDecisions);
        } catch (error) {
            console.error("Failed to fetch photos:", error);
        } finally {
            setLoading(false);
        }
    };

    const setAction = (ulid: string, action: "approve" | "reject") => {
        setDecisions({
            ...decisions,
            [ulid]: {
                ...decisions[ulid],
                action: decisions[ulid].action === action ? null : action,
            },
        });
    };

    const setContext = (ulid: string, context: string) => {
        setDecisions({
            ...decisions,
            [ulid]: {
                ...decisions[ulid],
                context,
            },
        });
    };

    const setVisibility = (ulid: string, visibility: "public" | "sanctum" | "private") => {
        setDecisions({
            ...decisions,
            [ulid]: {
                ...decisions[ulid],
                visibility,
            },
        });
    };

    const processBatch = async () => {
        const decisionsToProcess = Object.values(decisions).filter(d => d.action !== null);

        if (decisionsToProcess.length === 0) {
            alert("No decisions made. Mark photos as approve or reject first.");
            return;
        }

        setProcessing(true);
        try {
            await api.batchProcessPhotos(decisionsToProcess.map(d => ({
                ulid: d.ulid,
                action: d.action!,
                context: d.context || undefined,
                visibility: d.visibility,
            })));

            setCurrentIndex(0);
            await fetchPhotos();
        } catch (error) {
            console.error("Failed to process batch:", error);
            alert("Failed to process batch. Check console for errors.");
        } finally {
            setProcessing(false);
        }
    };

    const getDecisionCount = () => {
        const counts = Object.values(decisions).reduce((acc, d) => {
            if (d.action === "approve") acc.approve++;
            if (d.action === "reject") acc.reject++;
            return acc;
        }, { approve: 0, reject: 0 });
        return counts;
    };

    const nextPhoto = () => {
        if (currentIndex < photos.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevPhoto = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading photos...</div>
            </div>
        );
    }

    const counts = getDecisionCount();

    if (photos.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center py-12">
                    <p className="text-xl text-gray-500">No photos in staging</p>
                </div>
            </div>
        );
    }

    if (isMobile) {
        const photo = photos[currentIndex];
        const decision = decisions[photo.ulid];
        const isApproved = decision?.action === "approve";
        const isRejected = decision?.action === "reject";

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="bg-white border-b px-4 py-3">
                        <h1 className="text-2xl font-bold mb-1">Photo Staging</h1>
                        <p className="text-sm text-gray-600">
                            Photo {currentIndex + 1} of {photos.length} • {totalRemaining} total remaining
                        </p>
                        <p className="text-sm text-gray-600">
                            {counts.approve} to approve • {counts.reject} to reject
                        </p>
                    </div>

                    {/* Photo Display */}
                    <div className="flex-1 flex flex-col p-4">
                        <div className="relative mb-4 flex-shrink-0">
                            <div
                                className="aspect-square relative cursor-pointer rounded-lg overflow-hidden"
                                onClick={() => setPreviewImage(photo.url)}
                            >
                                <img
                                    src={photo.url}
                                    alt={photo.filename}
                                    className="w-full h-full object-cover"
                                />
                                {isApproved && (
                                    <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                        ✓ Approve
                                    </div>
                                )}
                                {isRejected && (
                                    <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                        ✗ Reject
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={prevPhoto}
                                disabled={currentIndex === 0}
                                className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={nextPhoto}
                                disabled={currentIndex === photos.length - 1}
                                className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="space-y-3">
                            <div>
                                <p className="font-medium text-sm mb-1 truncate" title={photo.filename}>
                                    {photo.filename}
                                </p>
                                <p className="text-xs text-gray-500 mb-3">
                                    {(photo.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Visibility</label>
                                <select
                                    value={decision?.visibility || "public"}
                                    onChange={(e) => setVisibility(photo.ulid, e.target.value as "public" | "sanctum" | "private")}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="public">Public</option>
                                    <option value="sanctum">Sanctum (Members)</option>
                                    <option value="private">Private</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Context (optional)</label>
                                <textarea
                                    value={decision?.context || ""}
                                    onChange={(e) => setContext(photo.ulid, e.target.value)}
                                    placeholder="Optional context for AI..."
                                    className="w-full px-3 py-2 border rounded-lg h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAction(photo.ulid, "approve")}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                        isApproved
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-green-100"
                                    }`}
                                >
                                    Approve
                                </button>

                                <button
                                    onClick={() => setAction(photo.ulid, "reject")}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                                        isRejected
                                            ? "bg-red-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-red-100"
                                    }`}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Process Button */}
                    <div className="bg-white border-t p-4">
                        <button
                            onClick={processBatch}
                            disabled={processing || (counts.approve === 0 && counts.reject === 0)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {processing ? "Processing..." : `Process Batch (${counts.approve + counts.reject})`}
                        </button>
                    </div>
                </div>

                {previewImage && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                        >
                            ✕
                        </button>
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Photo Staging</h1>
                    <p className="text-gray-600">
                        {totalRemaining} photos remaining • {counts.approve} to approve • {counts.reject} to reject
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                    {photos.map((photo) => {
                        const decision = decisions[photo.ulid];
                        const isApproved = decision?.action === "approve";
                        const isRejected = decision?.action === "reject";

                        return (
                            <div
                                key={photo.ulid}
                                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all ${
                                    isApproved ? "ring-4 ring-green-500" : isRejected ? "ring-4 ring-red-500" : ""
                                }`}
                            >
                                <div className="aspect-square relative cursor-pointer" onClick={() => setPreviewImage(photo.url)}>
                                    <img
                                        src={photo.url}
                                        alt={photo.filename}
                                        className="w-full h-full object-cover"
                                    />
                                    {isApproved && (
                                        <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                            ✓ Approve
                                        </div>
                                    )}
                                    {isRejected && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                            ✗ Reject
                                        </div>
                                    )}
                                </div>

                                <div className="p-4">
                                    <p className="font-medium text-sm mb-1 truncate" title={photo.filename}>
                                        {photo.filename}
                                    </p>
                                    <p className="text-xs text-gray-500 mb-3">
                                        {(photo.size / 1024 / 1024).toFixed(2)} MB
                                    </p>

                                    <div className="mb-3">
                                        <label className="block text-xs font-medium mb-1 text-gray-700">Visibility</label>
                                        <select
                                            value={decision?.visibility || "public"}
                                            onChange={(e) => setVisibility(photo.ulid, e.target.value as "public" | "sanctum" | "private")}
                                            className="w-full text-sm px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="public">Public</option>
                                            <option value="sanctum">Sanctum (Members)</option>
                                            <option value="private">Private</option>
                                        </select>
                                    </div>

                                    <textarea
                                        value={decision?.context || ""}
                                        onChange={(e) => setContext(photo.ulid, e.target.value)}
                                        placeholder="Optional context for AI..."
                                        className="w-full text-sm px-2 py-1 border rounded mb-3 h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setAction(photo.ulid, "approve")}
                                            className={`flex-1 text-sm py-2 px-4 rounded transition-colors ${
                                                isApproved
                                                    ? "bg-green-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-green-100"
                                            }`}
                                        >
                                            Approve
                                        </button>

                                        <button
                                            onClick={() => setAction(photo.ulid, "reject")}
                                            className={`flex-1 text-sm py-2 px-4 rounded transition-colors ${
                                                isRejected
                                                    ? "bg-red-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-red-100"
                                            }`}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="sticky bottom-0 bg-white border-t shadow-lg p-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="text-lg">
                            <span className="font-bold text-green-600">{counts.approve}</span> to approve •
                            <span className="font-bold text-red-600 ml-2">{counts.reject}</span> to reject
                        </div>

                        <button
                            onClick={processBatch}
                            disabled={processing || (counts.approve === 0 && counts.reject === 0)}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {processing ? "Processing..." : "Process Batch"}
                        </button>
                    </div>
                </div>

                {previewImage && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                        >
                            ✕
                        </button>
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StagingPage() {
    return (
        <ProtectedRoute>
            <StagingContent />
        </ProtectedRoute>
    );
}
