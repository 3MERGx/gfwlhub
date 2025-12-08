"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/components/ui/toast-context";
import Accordion from "@/components/Accordion";
import { sanitizeMarkdownHtml } from "@/lib/security";
import { useCSRF } from "@/hooks/useCSRF";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaTimes,
  FaSave,
  FaGripVertical,
  FaArrowUp,
  FaArrowDown,
  FaArrowsAlt,
  FaSearch,
} from "react-icons/fa";

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function FAQ() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const checkAdmin = () => {
      const userRole = session?.user?.role;
      setIsAdmin(userRole === "admin");
    };

    checkAdmin();
    fetchFAQs();
  }, [session]);

  const fetchFAQs = async () => {
    try {
      const response = await fetch("/api/faqs");
      if (response.ok) {
        const data = await response.json();
        setFaqs(data);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq._id);
    setEditingQuestion(faq.question);
    setEditingAnswer(faq.answer);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingQuestion("");
    setEditingAnswer("");
  };

  const handleSave = async () => {
    if (!editingId) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/faqs", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          id: editingId,
          question: editingQuestion,
          answer: editingAnswer,
          order: faqs.find((f) => f._id === editingId)?.order || 999,
        }),
      });

      if (response.ok) {
        await fetchFAQs();
        handleCancelEdit();
        showToast("FAQ updated successfully", 3000, "success");
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to update FAQ", 3000, "error");
      }
    } catch (error) {
      console.error("Error updating FAQ:", error);
      showToast("Failed to update FAQ", 3000, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const response = await fetch(`/api/faqs?id=${id}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
      });

      if (response.ok) {
        await fetchFAQs();
        showToast("FAQ deleted successfully", 3000, "success");
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to delete FAQ", 3000, "error");
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      showToast("Failed to delete FAQ", 3000, "error");
    }
  };

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      showToast("Please fill in both question and answer", 3000, "error");
      return;
    }

    setIsSaving(true);
    try {
      // Get the highest order and add 1
      const maxOrder = faqs.length > 0 ? Math.max(...faqs.map((f) => f.order)) : 0;
      const response = await fetch("/api/faqs", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          question: newQuestion,
          answer: newAnswer,
          order: maxOrder + 1,
        }),
      });

      if (response.ok) {
        await fetchFAQs();
        setShowAddModal(false);
        setNewQuestion("");
        setNewAnswer("");
        showToast("FAQ added successfully", 3000, "success");
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to create FAQ", 3000, "error");
      }
    } catch (error) {
      console.error("Error creating FAQ:", error);
      showToast("Failed to create FAQ", 3000, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;

    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[index - 1];
    newFaqs[index - 1] = temp;

    // Update orders
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });

    setFaqs(newFaqs);
    await saveOrder(newFaqs);
    showToast("FAQ moved up", 2000, "success");
  };

  const handleMoveDown = async (index: number) => {
    if (index === faqs.length - 1) return;

    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[index + 1];
    newFaqs[index + 1] = temp;

    // Update orders
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });

    setFaqs(newFaqs);
    await saveOrder(newFaqs);
    showToast("FAQ moved down", 2000, "success");
  };

  const saveOrder = async (orderedFaqs: FAQ[]) => {
    try {
      // Batch update all FAQs with new orders in a single API call
      const response = await fetch("/api/faqs/reorder", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          faqs: orderedFaqs.map((faq) => ({
            id: faq._id,
            order: faq.order,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }

      await fetchFAQs(); // Refresh to get updated data
    } catch (error) {
      console.error("Error saving order:", error);
      showToast("Failed to save order", 3000, "error");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newFaqs = [...faqs];
    const draggedItem = newFaqs[draggedIndex];
    newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(dropIndex, 0, draggedItem);

    // Update orders
    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });

    setFaqs(newFaqs);
    setDraggedIndex(null);
    await saveOrder(newFaqs);
    showToast("FAQ position updated", 2000, "success");
  };

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isReorderMode) return;
    setDraggedIndex(index);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isReorderMode || draggedIndex === null) return;
    const touch = e.touches[0];

    // Find which item we're over
    const items = Array.from(
      document.querySelectorAll('[data-faq-item]')
    ) as HTMLElement[];
    let overIndex = -1;
    items.forEach((item, i) => {
      const itemRect = item.getBoundingClientRect();
      if (
        touch.clientY >= itemRect.top &&
        touch.clientY <= itemRect.bottom &&
        i !== draggedIndex
      ) {
        overIndex = i;
      }
    });

    if (overIndex !== -1 && overIndex !== draggedIndex) {
      setDragOverIndex(overIndex);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (!isReorderMode || draggedIndex === null) return;

    const touch = e.changedTouches[0];
    const items = Array.from(
      document.querySelectorAll('[data-faq-item]')
    ) as HTMLElement[];
    let dropIndex = -1;

    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      if (
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom &&
        i !== draggedIndex
      ) {
        dropIndex = i;
      }
    });

    if (dropIndex !== -1 && dropIndex !== draggedIndex) {
      const newFaqs = [...faqs];
      const draggedItem = newFaqs[draggedIndex];
      newFaqs.splice(draggedIndex, 1);
      newFaqs.splice(dropIndex, 0, draggedItem);

      // Update orders
      newFaqs.forEach((faq, i) => {
        faq.order = i + 1;
      });

      setFaqs(newFaqs);
      await saveOrder(newFaqs);
      showToast("FAQ position updated", 2000, "success");
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragStartPos.current = null;
  };

  // Render answer as HTML (sanitized) with line break support
  const renderAnswer = (answer: string) => {
    // Convert \n to <br> tags for line breaks
    // Also handle existing HTML, so we need to be careful
    let processedAnswer = answer;
    
    // Sanitize and process answer
    // If the answer doesn't contain HTML tags, convert \n to <br>
    if (!/<[^>]+>/.test(answer)) {
      processedAnswer = answer.replace(/\n/g, '<br>');
    } else {
      // If it has HTML, convert \n to <br> but preserve existing HTML
      processedAnswer = answer.replace(/\n/g, '<br>');
    }
    
    // Sanitize HTML to prevent XSS
    const sanitizedAnswer = sanitizeMarkdownHtml(processedAnswer);
    
    return (
      <div
        className="[&_a]:text-blue-500 [&_a:hover]:underline [&_p]:mb-2 [&_p:last-child]:mb-0 [&_br]:mb-2"
        dangerouslySetInnerHTML={{ __html: sanitizedAnswer }}
      />
    );
  };

  // Filter FAQs based on debounced search query
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      if (!debouncedSearchQuery.trim()) return true;
      const query = debouncedSearchQuery.toLowerCase();
      const question = faq.question.toLowerCase();
      // Strip HTML tags from answer for searching
      const answerText = faq.answer.replace(/<[^>]+>/g, '').toLowerCase();
      return question.includes(query) || answerText.includes(query);
    });
  }, [faqs, debouncedSearchQuery]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center text-[rgb(var(--text-primary))]">
          Loading FAQs...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl mb-8">
          <div className="mb-6 pb-4 border-b border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] flex-1">
                Frequently Asked Questions
              </h1>
              {isAdmin && (
                <div className="hidden sm:flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setIsReorderMode(!isReorderMode)}
                    className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-sm ${
                      isReorderMode
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white ring-2 ring-yellow-500/30"
                        : "bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] border border-[rgb(var(--border-color))]"
                    }`}
                  >
                    <FaArrowsAlt size={14} />
                    {isReorderMode ? "Done Reordering" : "Reorder"}
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    <FaPlus size={14} />
                    Add FAQ
                  </button>
                </div>
              )}
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs..."
                className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>
          </div>

            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-[rgb(var(--text-secondary))]">
                  <p>
                    {debouncedSearchQuery
                      ? `No FAQs found matching "${debouncedSearchQuery}"`
                      : faqs.length === 0
                      ? `No FAQs found. ${isAdmin ? "Click 'Add FAQ' to create one!" : ""}`
                      : "No FAQs match your search"}
                  </p>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  // Find the original index in the full faqs array for reordering
                  const index = faqs.findIndex((f) => f._id === faq._id);
                  return (
                  <div
                    key={faq._id}
                    data-faq-item
                    className={`group relative transition-all ${
                      draggedIndex === index
                        ? "opacity-40 scale-95"
                        : draggedIndex !== null
                        ? "opacity-60"
                        : ""
                    } ${
                      dragOverIndex === index && draggedIndex !== null
                        ? "ring-2 ring-[#107c10] ring-offset-2 ring-offset-[#202020]"
                        : ""
                    } ${isReorderMode ? "cursor-move" : ""}`}
                    draggable={isReorderMode}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {isAdmin && editingId === faq._id ? (
                      // Edit Mode
                      <div className="p-5 bg-[rgb(var(--bg-card-alt))] rounded-lg border-2 border-yellow-500/50 shadow-lg">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
                          <div className="p-1.5 bg-yellow-500/20 rounded">
                            <FaGripVertical className="text-yellow-400" size={14} />
                          </div>
                          <span className="text-sm font-medium text-yellow-400">
                            Editing FAQ
                          </span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                              Question
                            </label>
                            <input
                              type="text"
                              value={editingQuestion}
                              onChange={(e) => setEditingQuestion(e.target.value)}
                              className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                              Answer (HTML supported)
                            </label>
                            <textarea
                              value={editingAnswer}
                              onChange={(e) => setEditingAnswer(e.target.value)}
                              rows={6}
                              className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20 font-mono text-sm"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSave}
                              disabled={isSaving}
                              className="px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 font-medium"
                            >
                              <FaSave size={14} />
                              {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors flex items-center gap-2 font-medium border border-[rgb(var(--border-color))]"
                            >
                              <FaTimes size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="relative">
                        <div className="flex items-start gap-2 sm:gap-3">
                          {/* Drag Handle - Only shown in reorder mode */}
                          {isAdmin && isReorderMode && (
                            <div className="pt-4 sm:pt-5 flex-shrink-0">
                              <div className="p-1.5 sm:p-2 text-[rgb(var(--text-muted))] flex items-center justify-center cursor-grab active:cursor-grabbing hover:text-[rgb(var(--text-secondary))] transition-colors">
                                <FaGripVertical size={16} className="sm:w-[18px] sm:h-[18px]" />
                              </div>
                            </div>
                          )}

                          {/* FAQ Content */}
                          <div className="flex-1 min-w-0">
                            <Accordion
                              title={faq.question}
                              content={renderAnswer(faq.answer)}
                              footer={
                                isAdmin ? (
                                  <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                    {isReorderMode ? (
                                      // Reorder arrows in footer when reordering
                                      <>
                                        <button
                                          onClick={() => handleMoveUp(index)}
                                          disabled={index === 0}
                                          className="w-full sm:w-auto px-3 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation border border-[rgb(var(--border-color))] hover:border-[#107c10] flex items-center justify-center gap-2 text-sm font-medium"
                                          title="Move up"
                                        >
                                          <FaArrowUp size={12} />
                                          <span className="sm:inline">Move Up</span>
                                        </button>
                                        <button
                                          onClick={() => handleMoveDown(index)}
                                          disabled={index === faqs.length - 1}
                                          className="w-full sm:w-auto px-3 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation border border-[rgb(var(--border-color))] hover:border-[#107c10] flex items-center justify-center gap-2 text-sm font-medium"
                                          title="Move down"
                                        >
                                          <FaArrowDown size={12} />
                                          <span className="sm:inline">Move Down</span>
                                        </button>
                                      </>
                                    ) : (
                                      // Edit/Delete buttons when not reordering
                                      <>
                                        <button
                                          onClick={() => handleEdit(faq)}
                                          className="w-full sm:w-auto px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation font-medium"
                                        >
                                          <FaEdit size={14} />
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDelete(faq._id)}
                                          className="w-full sm:w-auto px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm touch-manipulation font-medium"
                                        >
                                          <FaTrash size={14} />
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : undefined
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>

            {/* Admin buttons at bottom on small screens */}
            {isAdmin && (
              <div className="flex flex-col sm:hidden gap-2.5 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setIsReorderMode(!isReorderMode)}
                  className={`w-full px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm ${
                    isReorderMode
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white ring-2 ring-yellow-500/30"
                      : "bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] border border-[rgb(var(--border-color))]"
                  }`}
                >
                  <FaArrowsAlt size={14} />
                  {isReorderMode ? "Done Reordering" : "Reorder"}
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <FaPlus size={14} />
                  Add FAQ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add FAQ Modal */}
      {isAdmin && showAddModal && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => {
            setShowAddModal(false);
            setNewQuestion("");
            setNewAnswer("");
          }}
        >
          <div
            className="bg-[rgb(var(--bg-card))] rounded-lg max-w-2xl w-full border border-[rgb(var(--border-color))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#107c10]/20 rounded">
                  <FaPlus className="text-[#107c10]" size={16} />
                </div>
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Add New FAQ</h2>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestion("");
                  setNewAnswer("");
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Question
                </label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20"
                  placeholder="Enter question..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Answer (HTML supported)
                </label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20 font-mono text-sm"
                  placeholder="Enter answer (HTML supported)..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-[rgb(var(--border-color))]">
              <button
                onClick={handleAdd}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
              >
                <FaSave size={14} />
                {isSaving ? "Saving..." : "Save FAQ"}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewQuestion("");
                  setNewAnswer("");
                }}
                className="px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors font-medium border border-[rgb(var(--border-color))]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
