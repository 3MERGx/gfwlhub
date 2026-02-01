"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/components/ui/toast-context";
import ConfirmDialog from "@/components/ConfirmDialog";
import Accordion from "@/components/Accordion";
import { sanitizeHtml, safeLog } from "@/lib/security";
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
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaLink,
  FaUnlink,
} from "react-icons/fa";

const SUBMIT_QUESTION_MAX = 500;
const SUBMIT_ANSWER_MAX = 5000;
const LINK_URL_MAX = 2000;

/** Allow http, https, mailto, and relative paths; block javascript:, data:, etc. */
function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:")) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  if (!trimmed.includes(":")) return true;
  return false;
}

/** True if the current selection (or cursor) is inside an <a> within the editor. */
function isSelectionInLink(editor: HTMLElement): boolean {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  let node: Node | null = sel.anchorNode;
  while (node && node !== editor) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "A") return true;
    node = node.parentNode;
  }
  return false;
}

/** Returns the href of the link containing the selection, or empty string. */
function getSelectionLinkHref(editor: HTMLElement): string {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  let node: Node | null = sel.anchorNode;
  while (node && node !== editor) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "A") {
      const href = (node as HTMLAnchorElement).getAttribute("href");
      return href ?? "";
    }
    node = node.parentNode;
  }
  return "";
}

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
  const router = useRouter();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitQuestion, setSubmitQuestion] = useState("");
  const [submitAnswerCharCount, setSubmitAnswerCharCount] = useState(0);
  const [submitToolbarActive, setSubmitToolbarActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    link: false,
  });
  const submitAnswerEditorRef = useRef<HTMLDivElement>(null);
  const editAnswerEditorRef = useRef<HTMLDivElement>(null);
  const [editToolbarActive, setEditToolbarActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    link: false,
  });
  const [editAnswerCharCount, setEditAnswerCharCount] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState("");
  const [linkDialogContext, setLinkDialogContext] = useState<"submit" | "edit" | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const saveOrderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOrderRef = useRef<FAQ[] | null>(null);
  const saveOrderRef = useRef<((orderedFaqs: FAQ[]) => Promise<void>) | null>(null);
  const linkDialogInputRef = useRef<HTMLInputElement>(null);

  const REORDER_SAVE_DEBOUNCE_MS = 400;

  useEffect(() => {
    const checkAdmin = () => {
      const userRole = session?.user?.role;
      setIsAdmin(userRole === "admin");
    };

    checkAdmin();
    fetchFAQs();
  }, [session]);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (saveOrderTimeoutRef.current) {
        clearTimeout(saveOrderTimeoutRef.current);
      }
    };
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch("/api/faqs");
      if (response.ok) {
        const data = await response.json();
        setFaqs(data);
      }
    } catch (error) {
      safeLog.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq._id);
    setEditingQuestion(faq.question);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingQuestion("");
    if (editAnswerEditorRef.current) editAnswerEditorRef.current.innerHTML = "";
    setEditAnswerCharCount(0);
    setEditToolbarActive({ bold: false, italic: false, underline: false, list: false, link: false });
  };

  const handleSave = async () => {
    if (!editingId) return;

    const answerHtml = editAnswerEditorRef.current?.innerHTML?.trim() ?? "";
    const answerText = editAnswerEditorRef.current?.innerText?.trim() ?? "";
    if (!answerText) {
      showToast("Please enter an answer", 3000, "error");
      return;
    }
    if (answerHtml.length > SUBMIT_ANSWER_MAX) {
      showToast(`Answer must be ${SUBMIT_ANSWER_MAX} characters or less`, 3000, "error");
      return;
    }

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
          answer: answerHtml,
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
      safeLog.error("Error updating FAQ:", error);
      showToast("Failed to update FAQ", 3000, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeleteConfirmId(null);

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
      safeLog.error("Error deleting FAQ:", error);
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
      safeLog.error("Error creating FAQ:", error);
      showToast("Failed to create FAQ", 3000, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSubmitToolbarActive = useCallback(() => {
    const editor = submitAnswerEditorRef.current;
    if (!editor) return;
    const sel = document.getSelection();
    const inEditor = sel?.anchorNode && editor.contains(sel.anchorNode);
    if (!inEditor) {
      setSubmitToolbarActive((prev) =>
        prev.bold || prev.italic || prev.underline || prev.list || prev.link
          ? { bold: false, italic: false, underline: false, list: false, link: false }
          : prev
      );
      return;
    }
    setSubmitToolbarActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      list: document.queryCommandState("insertUnorderedList"),
      link: isSelectionInLink(editor),
    });
  }, []);

  useEffect(() => {
    if (!showSubmitModal) return;
    const onSelectionChange = () => updateSubmitToolbarActive();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [showSubmitModal, updateSubmitToolbarActive]);

  const updateEditToolbarActive = useCallback(() => {
    const editor = editAnswerEditorRef.current;
    if (!editor) return;
    const sel = document.getSelection();
    const inEditor = sel?.anchorNode && editor.contains(sel.anchorNode);
    if (!inEditor) {
      setEditToolbarActive((prev) =>
        prev.bold || prev.italic || prev.underline || prev.list || prev.link
          ? { bold: false, italic: false, underline: false, list: false, link: false }
          : prev
      );
      return;
    }
    setEditToolbarActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      list: document.queryCommandState("insertUnorderedList"),
      link: isSelectionInLink(editor),
    });
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const faq = faqs.find((f) => f._id === editingId);
    if (!faq || !editAnswerEditorRef.current) return;
    editAnswerEditorRef.current.innerHTML = faq.answer;
    setEditAnswerCharCount(faq.answer.length);
    setEditToolbarActive({ bold: false, italic: false, underline: false, list: false, link: false });
    // Only seed when opening edit; faqs omitted to avoid overwriting in-progress edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    const onSelectionChange = () => updateEditToolbarActive();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [editingId, updateEditToolbarActive]);

  const handleOpenLinkDialog = useCallback(
    (context: "submit" | "edit") => {
      const editor = context === "submit" ? submitAnswerEditorRef.current : editAnswerEditorRef.current;
      const currentHref = editor ? getSelectionLinkHref(editor) : "";
      setLinkDialogUrl(currentHref);
      setLinkDialogContext(context);
      setLinkDialogOpen(true);
    },
    []
  );

  const handleLinkDialogInsert = useCallback(() => {
    const url = linkDialogUrl.trim();
    if (!url) {
      showToast("Please enter a URL", 3000, "error");
      return;
    }
    if (url.length > LINK_URL_MAX) {
      showToast(`URL must be ${LINK_URL_MAX} characters or less`, 3000, "error");
      return;
    }
    if (!isSafeLinkUrl(url)) {
      showToast("Invalid or unsafe URL. Use http, https, mailto, or relative paths.", 3000, "error");
      return;
    }
    if (linkDialogContext === "submit") {
      submitAnswerEditorRef.current?.focus();
      document.execCommand("createLink", false, url);
      updateSubmitToolbarActive();
    } else if (linkDialogContext === "edit") {
      editAnswerEditorRef.current?.focus();
      document.execCommand("createLink", false, url);
      updateEditToolbarActive();
    }
    setLinkDialogOpen(false);
    setLinkDialogUrl("");
    setLinkDialogContext(null);
  }, [linkDialogUrl, linkDialogContext, showToast]);

  const handleLinkDialogCancel = useCallback(() => {
    setLinkDialogOpen(false);
    setLinkDialogUrl("");
    setLinkDialogContext(null);
  }, []);

  useEffect(() => {
    if (linkDialogOpen) {
      linkDialogInputRef.current?.focus();
    }
  }, [linkDialogOpen]);

  useEffect(() => {
    if (!linkDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLinkDialogCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [linkDialogOpen, handleLinkDialogCancel]);

  const handleUnlink = useCallback(
    (editorRef: React.RefObject<HTMLDivElement | null>, updateToolbar: () => void) => {
      editorRef.current?.focus();
      document.execCommand("unlink", false);
      updateToolbar();
    },
    []
  );

  const handleSubmitFAQ = async () => {
    const question = submitQuestion.trim();
    const answerHtml = submitAnswerEditorRef.current?.innerHTML?.trim() ?? "";
    const answerText = submitAnswerEditorRef.current?.innerText?.trim() ?? "";

    if (!question) {
      showToast("Please enter a question", 3000, "error");
      return;
    }
    if (question.length > SUBMIT_QUESTION_MAX) {
      showToast(`Question must be ${SUBMIT_QUESTION_MAX} characters or less`, 3000, "error");
      return;
    }
    if (!answerText) {
      showToast("Please enter an answer", 3000, "error");
      return;
    }
    if (answerHtml.length > SUBMIT_ANSWER_MAX) {
      showToast(`Answer must be ${SUBMIT_ANSWER_MAX} characters or less`, 3000, "error");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/faq-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          question,
          answer: answerHtml,
        }),
      });

      if (response.ok) {
        setShowSubmitModal(false);
        setSubmitQuestion("");
        if (submitAnswerEditorRef.current) submitAnswerEditorRef.current.innerHTML = "";
        setSubmitAnswerCharCount(0);
        setSubmitToolbarActive({ bold: false, italic: false, underline: false, list: false, link: false });
        showToast("FAQ submitted for review. Thank you!", 4000, "success");
      } else {
        const error = await response.json();
        showToast(error.error || "Failed to submit FAQ", 3000, "error");
      }
    } catch (error) {
      safeLog.error("Error submitting FAQ:", error);
      showToast("Failed to submit FAQ", 3000, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleSaveOrder = useCallback((orderedFaqs: FAQ[]) => {
    if (saveOrderTimeoutRef.current) {
      clearTimeout(saveOrderTimeoutRef.current);
      saveOrderTimeoutRef.current = null;
    }
    pendingOrderRef.current = orderedFaqs;
    saveOrderTimeoutRef.current = setTimeout(() => {
      saveOrderTimeoutRef.current = null;
      const toSave = pendingOrderRef.current;
      pendingOrderRef.current = null;
      if (toSave && saveOrderRef.current) {
        saveOrderRef.current(toSave);
      }
    }, REORDER_SAVE_DEBOUNCE_MS);
  }, []);

  const handleMoveUp = (index: number) => {
    if (index === 0 || isSavingOrder) return;

    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[index - 1];
    newFaqs[index - 1] = temp;

    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });

    setFaqs(newFaqs);
    scheduleSaveOrder(newFaqs);
    showToast("FAQ moved up", 2000, "success");
  };

  const handleMoveDown = (index: number) => {
    if (index === faqs.length - 1 || isSavingOrder) return;

    const newFaqs = [...faqs];
    const temp = newFaqs[index];
    newFaqs[index] = newFaqs[index + 1];
    newFaqs[index + 1] = temp;

    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });

    setFaqs(newFaqs);
    scheduleSaveOrder(newFaqs);
    showToast("FAQ moved down", 2000, "success");
  };

  const saveOrder = async (orderedFaqs: FAQ[]) => {
    if (isSavingOrder) return;
    setIsSavingOrder(true);
    try {
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
      // Skip refetch on success; trust local state for performance
    } catch (error) {
      safeLog.error("Error saving order:", error);
      showToast("Failed to save order", 3000, "error");
      await fetchFAQs(); // Revert list to server state
    } finally {
      setIsSavingOrder(false);
    }
  };
  saveOrderRef.current = saveOrder;

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

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex || isSavingOrder) {
      setDraggedIndex(null);
      return;
    }

    const newFaqs = [...faqs];
    const draggedItem = newFaqs[draggedIndex];
    newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(dropIndex, 0, draggedItem);

    newFaqs.forEach((faq, i) => {
      faq.order = i + 1;
    });

    setFaqs(newFaqs);
    setDraggedIndex(null);
    scheduleSaveOrder(newFaqs);
    showToast("FAQ position updated", 2000, "success");
  };

  // Resolve full-array index from element (works when search filter is active)
  const getFaqIndexFromElement = (element: Element | null): number => {
    if (!element) return -1;
    const item = element.closest("[data-faq-id]");
    const id = item?.getAttribute("data-faq-id");
    if (!id) return -1;
    return faqs.findIndex((f) => f._id === id);
  };

  // Touch handlers for mobile drag and drop
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isReorderMode || isSavingOrder) return;
    setDraggedIndex(index);
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isReorderMode || draggedIndex === null) return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const overIndex = getFaqIndexFromElement(element);
    if (overIndex !== -1 && overIndex !== draggedIndex) {
      setDragOverIndex(overIndex);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isReorderMode || draggedIndex === null || isSavingOrder) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragStartPos.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropIndex = getFaqIndexFromElement(element);

    if (dropIndex !== -1 && dropIndex !== draggedIndex) {
      const newFaqs = [...faqs];
      const draggedItem = newFaqs[draggedIndex];
      newFaqs.splice(draggedIndex, 1);
      newFaqs.splice(dropIndex, 0, draggedItem);

      newFaqs.forEach((faq, i) => {
        faq.order = i + 1;
      });

      setFaqs(newFaqs);
      scheduleSaveOrder(newFaqs);
      showToast("FAQ position updated", 2000, "success");
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragStartPos.current = null;
  };

  // Render answer as HTML (sanitized) with line break support
  const renderAnswer = (answer: string) => {
    // Convert \n to <br> tags for line breaks if there's no existing HTML
    let processedAnswer = answer;
    
    // If the answer doesn't contain HTML tags, convert \n to <br>
    if (!/<[^>]+>/.test(answer)) {
      processedAnswer = answer.replace(/\n/g, '<br>');
    }
    
    // Sanitize HTML to prevent XSS while preserving safe HTML tags
    const sanitizedAnswer = sanitizeHtml(processedAnswer);
    
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
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl border border-[rgb(var(--border-color))]">
            <div className="h-9 w-3/4 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-[rgb(var(--bg-card-alt))] rounded-lg animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl mb-8">
          <div className="mb-6 pb-4 border-b border-[rgb(var(--border-color))]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] flex-1">
                Frequently Asked Questions
              </h1>
              {isAdmin && (
                <div className="hidden sm:flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      if (!isReorderMode) {
                        setSearchQuery("");
                        setIsReorderMode(true);
                      } else {
                        setIsReorderMode(false);
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }
                    }}
                    disabled={isSavingOrder}
                    className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                      isReorderMode
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white ring-2 ring-yellow-500/30"
                        : "bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] border border-[rgb(var(--border-color))]"
                    }`}
                  >
                    <FaArrowsAlt size={14} />
                    {isSavingOrder ? "Saving…" : isReorderMode ? "Done Reordering" : "Reorder"}
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  if (session) {
                    setShowSubmitModal(true);
                  } else {
                    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/faq"));
                  }
                }}
                className="px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <FaPlus size={14} />
                Submit FAQ
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" size={16} aria-hidden />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs..."
                className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20"
                aria-label="Search FAQs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] transition-colors"
                  aria-label="Clear search"
                >
                  <FaTimes size={14} aria-hidden />
                </button>
              )}
            </div>
          </div>

            {isAdmin && isReorderMode && (
              <p className="mb-3 text-sm text-[rgb(var(--text-muted))]" role="status">
                Drag the handle or use Move Up / Move Down. Alt+Arrow Up or Down to move. Changes save automatically.
              </p>
            )}

            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-12 text-[rgb(var(--text-secondary))]">
                  <p>
                    {debouncedSearchQuery
                      ? `No FAQs found matching "${debouncedSearchQuery}"`
                      : faqs.length === 0
                      ? "No FAQs found."
                      : "No FAQs match your search"}
                  </p>
                  {debouncedSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-sm font-medium text-[#107c10] hover:text-[#0d6b0d] hover:underline focus:ring-2 focus:ring-[#107c10]/50 focus:outline-none rounded px-2 py-1"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  // Find the original index in the full faqs array for reordering
                  const index = faqs.findIndex((f) => f._id === faq._id);
                  return (
                  <div key={`wrapper-${faq._id}`} className="relative">
                    {/* Drop line indicator: show above this item when it's the drop target */}
                    {isAdmin && isReorderMode && draggedIndex !== null && dragOverIndex === index && (
                      <div
                        className="absolute left-0 right-0 -top-1.5 z-10 h-1 rounded-full bg-[#107c10] shadow-sm"
                        aria-hidden
                      />
                    )}
                  <div
                    key={faq._id}
                    data-faq-item
                    data-faq-id={faq._id}
                    className={`group relative transition-all ${
                      draggedIndex === index
                        ? "opacity-40 scale-95"
                        : draggedIndex !== null
                        ? "opacity-60"
                        : ""
                    } ${isReorderMode && !isSavingOrder ? "cursor-default" : ""} ${isSavingOrder ? "pointer-events-none opacity-90" : ""}`}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    tabIndex={isAdmin && isReorderMode ? 0 : -1}
                    onKeyDown={(e) => {
                      if (!isAdmin || !isReorderMode || isSavingOrder) return;
                      if (e.altKey && e.key === "ArrowUp") {
                        e.preventDefault();
                        handleMoveUp(index);
                      } else if (e.altKey && e.key === "ArrowDown") {
                        e.preventDefault();
                        handleMoveDown(index);
                      }
                    }}
                    aria-label={isAdmin && isReorderMode ? `FAQ item ${index + 1} of ${faqs.length}. Use Alt+Arrow Up or Down to move, or drag the handle.` : undefined}
                  >
                    {isAdmin && editingId === faq._id ? (
                      // Edit Mode
                      <div className="p-5 bg-[rgb(var(--bg-card-alt))] rounded-lg border-2 border-yellow-500/50 shadow-lg">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgb(var(--border-color))]">
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
                              Answer
                            </label>
                            <div className="flex flex-wrap gap-1 p-1.5 rounded-t-lg border border-b-0 border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))]">
                              <button
                                type="button"
                                onClick={() => {
                                  editAnswerEditorRef.current?.focus();
                                  document.execCommand("bold", false);
                                  updateEditToolbarActive();
                                }}
                                className={`p-2 rounded transition-colors ${
                                  editToolbarActive.bold
                                    ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                                    : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                                }`}
                                title="Bold"
                                aria-label="Bold"
                                aria-pressed={editToolbarActive.bold}
                              >
                                <FaBold size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  editAnswerEditorRef.current?.focus();
                                  document.execCommand("italic", false);
                                  updateEditToolbarActive();
                                }}
                                className={`p-2 rounded transition-colors ${
                                  editToolbarActive.italic
                                    ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                                    : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                                }`}
                                title="Italic"
                                aria-label="Italic"
                                aria-pressed={editToolbarActive.italic}
                              >
                                <FaItalic size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  editAnswerEditorRef.current?.focus();
                                  document.execCommand("underline", false);
                                  updateEditToolbarActive();
                                }}
                                className={`p-2 rounded transition-colors ${
                                  editToolbarActive.underline
                                    ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                                    : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                                }`}
                                title="Underline"
                                aria-label="Underline"
                                aria-pressed={editToolbarActive.underline}
                              >
                                <FaUnderline size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  editAnswerEditorRef.current?.focus();
                                  document.execCommand("insertUnorderedList", false);
                                  updateEditToolbarActive();
                                }}
                                className={`p-2 rounded transition-colors ${
                                  editToolbarActive.list
                                    ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                                    : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                                }`}
                                title="Bullet list"
                                aria-label="Bullet list"
                                aria-pressed={editToolbarActive.list}
                              >
                                <FaListUl size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenLinkDialog("edit")}
                                className="p-2 rounded transition-colors hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                                title="Insert link"
                                aria-label="Insert link"
                              >
                                <FaLink size={14} />
                              </button>
                              {editToolbarActive.link && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlink(editAnswerEditorRef, updateEditToolbarActive)}
                                  className="p-2 rounded transition-colors hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                                  title="Remove link"
                                  aria-label="Remove link"
                                >
                                  <FaUnlink size={14} />
                                </button>
                              )}
                            </div>
                            <div
                              ref={editAnswerEditorRef}
                              contentEditable
                              role="textbox"
                              aria-label="Answer"
                              aria-multiline="true"
                              onInput={() => {
                                const el = editAnswerEditorRef.current;
                                setEditAnswerCharCount(el?.innerHTML?.length ?? 0);
                              }}
                              onSelect={updateEditToolbarActive}
                              onKeyUp={updateEditToolbarActive}
                              onMouseUp={updateEditToolbarActive}
                              className="min-h-[140px] max-h-[280px] overflow-y-auto w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-b-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 empty:before:content-[attr(data-placeholder)] empty:before:text-[rgb(var(--text-muted))]"
                              data-placeholder="Enter answer..."
                              suppressContentEditableWarning
                            />
                            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]" aria-live="polite">
                              {editAnswerCharCount} / {SUBMIT_ANSWER_MAX} characters
                              {editAnswerCharCount > SUBMIT_ANSWER_MAX && (
                                <span className="text-red-500 ml-1">(over limit)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSave}
                              disabled={
                                isSaving ||
                                !editingQuestion.trim() ||
                                editAnswerCharCount === 0 ||
                                editAnswerCharCount > SUBMIT_ANSWER_MAX
                              }
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
                          {/* Drag Handle - only this starts drag/touch (reorder mode) */}
                          {isAdmin && isReorderMode && (
                            <div className="pt-4 sm:pt-5 flex-shrink-0">
                              <div
                                className="p-1.5 sm:p-2 text-[rgb(var(--text-muted))] flex items-center justify-center cursor-grab active:cursor-grabbing hover:text-[rgb(var(--text-secondary))] transition-colors touch-none"
                                draggable={!isSavingOrder}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, index);
                                }}
                                onTouchStart={(e) => {
                                  handleTouchStart(e, index);
                                }}
                                role="button"
                                tabIndex={-1}
                                aria-label="Drag to reorder"
                              >
                                <FaGripVertical size={16} className="sm:w-[18px] sm:h-[18px] pointer-events-none" />
                              </div>
                            </div>
                          )}

                          {/* FAQ Content */}
                          <div className="flex-1 min-w-0">
                            <Accordion
                              contentId={`faq-answer-${faq._id}`}
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
                                          disabled={index === 0 || isSavingOrder}
                                          className="w-full sm:w-auto px-3 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation border border-[rgb(var(--border-color))] hover:border-[#107c10] flex items-center justify-center gap-2 text-sm font-medium"
                                          title="Move up"
                                        >
                                          <FaArrowUp size={12} />
                                          <span className="sm:inline">Move Up</span>
                                        </button>
                                        <button
                                          onClick={() => handleMoveDown(index)}
                                          disabled={index === faqs.length - 1 || isSavingOrder}
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
                                          onClick={() => handleDeleteClick(faq._id)}
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
                  </div>
                  );
                })
              )}
            </div>

            {/* Admin buttons at bottom on small screens */}
            {isAdmin && (
              <div className="flex flex-col sm:hidden gap-2.5 mt-6 pt-4 border-t border-[rgb(var(--border-color))]">
                <button
                  onClick={() => {
                    if (!isReorderMode) {
                      setSearchQuery("");
                      setIsReorderMode(true);
                    } else {
                      setIsReorderMode(false);
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm ${
                    isReorderMode
                      ? "bg-yellow-600 hover:bg-yellow-700 text-white ring-2 ring-yellow-500/30"
                      : "bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] border border-[rgb(var(--border-color))]"
                  }`}
                >
                  <FaArrowsAlt size={14} />
                  {isReorderMode ? "Done Reordering" : "Reorder"}
                </button>
              </div>
            )}

            {/* Submit FAQ button on mobile (guests go to sign-in) */}
            <div className="sm:hidden mt-6 pt-4 border-t border-[rgb(var(--border-color))]">
              <button
                onClick={() => {
                  if (session) {
                    setShowSubmitModal(true);
                  } else {
                    router.push("/auth/signin?callbackUrl=" + encodeURIComponent("/faq"));
                  }
                }}
                className="w-full px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <FaPlus size={14} />
                Submit FAQ
              </button>
            </div>

            {(debouncedSearchQuery.trim() || filteredFaqs.length > 0) && (
              <p
                className="mt-6 pt-4 border-t border-[rgb(var(--border-color))] text-center text-sm text-[rgb(var(--text-secondary))]"
                aria-live="polite"
              >
                {debouncedSearchQuery.trim()
                  ? `Showing ${filteredFaqs.length} ${filteredFaqs.length === 1 ? "FAQ" : "FAQs"}`
                  : `${faqs.length} ${faqs.length === 1 ? "FAQ" : "FAQs"}`}
              </p>
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
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border-color))]">
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

      {/* Submit FAQ Modal */}
      {session && showSubmitModal && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => {
            setShowSubmitModal(false);
            setSubmitQuestion("");
            if (submitAnswerEditorRef.current) submitAnswerEditorRef.current.innerHTML = "";
            setSubmitAnswerCharCount(0);
            setSubmitToolbarActive({ bold: false, italic: false, underline: false, list: false, link: false });
          }}
        >
          <div
            className="bg-[rgb(var(--bg-card))] rounded-lg max-w-2xl w-full border border-[rgb(var(--border-color))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border-color))]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#107c10]/20 rounded">
                  <FaPlus className="text-[#107c10]" size={16} />
                </div>
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Submit FAQ</h2>
              </div>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSubmitQuestion("");
                  if (submitAnswerEditorRef.current) submitAnswerEditorRef.current.innerHTML = "";
                  setSubmitAnswerCharCount(0);
                  setSubmitToolbarActive({ bold: false, italic: false, underline: false, list: false, link: false });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Submit a FAQ for review by our team. If approved, it will be added to the FAQ page.
              </p>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Question
                </label>
                <input
                  type="text"
                  value={submitQuestion}
                  onChange={(e) => setSubmitQuestion(e.target.value.slice(0, SUBMIT_QUESTION_MAX))}
                  maxLength={SUBMIT_QUESTION_MAX}
                  className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20"
                  placeholder="Enter question..."
                  autoFocus
                />
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]" aria-live="polite">
                  {submitQuestion.length} / {SUBMIT_QUESTION_MAX}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Answer
                </label>
                <div className="flex flex-wrap gap-1 p-1.5 rounded-t-lg border border-b-0 border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))]">
                  <button
                    type="button"
                    onClick={() => {
                      submitAnswerEditorRef.current?.focus();
                      document.execCommand("bold", false);
                      updateSubmitToolbarActive();
                    }}
                    className={`p-2 rounded transition-colors ${
                      submitToolbarActive.bold
                        ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                        : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                    }`}
                    title="Bold"
                    aria-label="Bold"
                    aria-pressed={submitToolbarActive.bold}
                  >
                    <FaBold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      submitAnswerEditorRef.current?.focus();
                      document.execCommand("italic", false);
                      updateSubmitToolbarActive();
                    }}
                    className={`p-2 rounded transition-colors ${
                      submitToolbarActive.italic
                        ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                        : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                    }`}
                    title="Italic"
                    aria-label="Italic"
                    aria-pressed={submitToolbarActive.italic}
                  >
                    <FaItalic size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      submitAnswerEditorRef.current?.focus();
                      document.execCommand("underline", false);
                      updateSubmitToolbarActive();
                    }}
                    className={`p-2 rounded transition-colors ${
                      submitToolbarActive.underline
                        ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                        : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                    }`}
                    title="Underline"
                    aria-label="Underline"
                    aria-pressed={submitToolbarActive.underline}
                  >
                    <FaUnderline size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      submitAnswerEditorRef.current?.focus();
                      document.execCommand("insertUnorderedList", false);
                      updateSubmitToolbarActive();
                    }}
                    className={`p-2 rounded transition-colors ${
                      submitToolbarActive.list
                        ? "bg-[#107c10]/25 text-[#107c10] ring-1 ring-[#107c10]/50"
                        : "hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                    }`}
                    title="Bullet list"
                    aria-label="Bullet list"
                    aria-pressed={submitToolbarActive.list}
                  >
                    <FaListUl size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenLinkDialog("submit")}
                    className="p-2 rounded transition-colors hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                    title="Insert link"
                    aria-label="Insert link"
                  >
                    <FaLink size={14} />
                  </button>
                  {submitToolbarActive.link && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(submitAnswerEditorRef, updateSubmitToolbarActive)}
                      className="p-2 rounded transition-colors hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))]"
                      title="Remove link"
                      aria-label="Remove link"
                    >
                      <FaUnlink size={14} />
                    </button>
                  )}
                </div>
                <div
                  ref={submitAnswerEditorRef}
                  contentEditable
                  role="textbox"
                  aria-label="Answer"
                  aria-multiline="true"
                  onInput={() => {
                    const el = submitAnswerEditorRef.current;
                    setSubmitAnswerCharCount(el?.innerHTML?.length ?? 0);
                  }}
                  onSelect={updateSubmitToolbarActive}
                  onKeyUp={updateSubmitToolbarActive}
                  onMouseUp={updateSubmitToolbarActive}
                  className="min-h-[180px] max-h-[320px] overflow-y-auto w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-b-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 empty:before:content-[attr(data-placeholder)] empty:before:text-[rgb(var(--text-muted))]"
                  data-placeholder="Enter answer..."
                  suppressContentEditableWarning
                />
                <p className="mt-1 text-xs text-[rgb(var(--text-muted))]" aria-live="polite">
                  {submitAnswerCharCount} / {SUBMIT_ANSWER_MAX} characters
                  {submitAnswerCharCount > SUBMIT_ANSWER_MAX && (
                    <span className="text-red-500 ml-1">(over limit)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-[rgb(var(--border-color))]">
              <button
                onClick={handleSubmitFAQ}
                disabled={
                  isSaving ||
                  !submitQuestion.trim() ||
                  submitAnswerCharCount === 0 ||
                  submitAnswerCharCount > SUBMIT_ANSWER_MAX ||
                  submitQuestion.length > SUBMIT_QUESTION_MAX
                }
                className="flex-1 px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <FaSave size={14} />
                {isSaving ? "Submitting..." : "Submit for Review"}
              </button>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSubmitQuestion("");
                  if (submitAnswerEditorRef.current) submitAnswerEditorRef.current.innerHTML = "";
                  setSubmitAnswerCharCount(0);
                  setSubmitToolbarActive({ bold: false, italic: false, underline: false, list: false, link: false });
                }}
                className="px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors font-medium border border-[rgb(var(--border-color))]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Link dialog */}
      {linkDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 dark:bg-black/70"
          onClick={handleLinkDialogCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-dialog-title"
        >
          <div
            className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border border-[rgb(var(--border-color))] shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="link-dialog-title" className="text-lg font-semibold text-[rgb(var(--text-primary))] mb-3 flex items-center gap-2">
              <FaLink size={16} />
              Insert link
            </h2>
            <label htmlFor="link-dialog-url" className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
              URL
            </label>
            <input
              ref={linkDialogInputRef}
              id="link-dialog-url"
              type="url"
              value={linkDialogUrl}
              onChange={(e) => setLinkDialogUrl(e.target.value.slice(0, LINK_URL_MAX))}
              maxLength={LINK_URL_MAX}
              placeholder="https://example.com or /page"
              className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20 mb-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLinkDialogInsert();
                }
              }}
            />
            <p className="text-xs text-[rgb(var(--text-muted))] mb-4">
              Only http, https, mailto, and relative paths (e.g. /faq) are allowed. Max {LINK_URL_MAX} characters.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleLinkDialogCancel}
                className="px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkDialogInsert}
                className="px-4 py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg font-medium"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </>
  );
}
