"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AttachmentPreviewModal } from "@/components/employees/attachment-preview-modal";
import { useToast, useUserRole } from "@/components/providers";
import { Badge, Button, EmptyState, ErrorState, LoadingBlock, Modal, MonthPicker, SearchableSelect, StatusBadge, TablePaginationFooter, TableRowActions } from "@/components/ui";
import { api } from "@/lib/api";
import type { Dependent, Employee } from "@/lib/types";
import { formatDate, formatMonthYear } from "@/lib/utils";

export function DependentsSubtab({
  projectId,
  employees,
}: {
  projectId: string;
  employees: Employee[];
}) {
  const { notify } = useToast();
  const { role } = useUserRole();
  const isAccountant = role === "accountant";
  const queryClient = useQueryClient();

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal states
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTargetIds, setConfirmTargetIds] = useState<string[]>([]);
  const [confirmTargetDependent, setConfirmTargetDependent] = useState<Dependent | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRelationship, setEditRelationship] = useState<"child" | "spouse" | "parent" | "other">("child");
  const [editDob, setEditDob] = useState("");
  const [editIdCard, setEditIdCard] = useState("");
  const [editTaxCode, setEditTaxCode] = useState("");
  const [editStartDate, setEditStartDate] = useState("2026-08");
  const [editEndDate, setEditEndDate] = useState("");
  const [editAttachmentType, setEditAttachmentType] = useState<"cccd_2_sided" | "disability_cert" | "birth_cert">("cccd_2_sided");

  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Declare Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRelationship, setFormRelationship] = useState<"child" | "spouse" | "parent" | "other">("child");
  const [formDob, setFormDob] = useState("");
  const [formIdCard, setFormIdCard] = useState("");
  const [formStartDate, setFormStartDate] = useState("2026-08");
  const [formAttachmentType, setFormAttachmentType] = useState<"cccd_2_sided" | "disability_cert" | "birth_cert">("cccd_2_sided");
  const [declareFile, setDeclareFile] = useState<File | null>(null);
  const [declareFilePreviewUrl, setDeclareFilePreviewUrl] = useState<string | null>(null);
  const declareFileInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Upload Attachment Modal State
  const [uploadAttachmentModalOpen, setUploadAttachmentModalOpen] = useState(false);
  const [selectedDependentForUpload, setSelectedDependentForUpload] = useState<Dependent | null>(null);
  const [uploadDocType, setUploadDocType] = useState<"cccd_2_sided" | "disability_cert" | "birth_cert">("cccd_2_sided");
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [uploadDocPreviewUrl, setUploadDocPreviewUrl] = useState<string | null>(null);
  const uploadDocInputRef = useRef<HTMLInputElement>(null);

  // File Upload State for Import Modal
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSelectedFile = (file: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const isValidType = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isValidType) {
      notify("Vui lòng chọn tệp định dạng Excel (.xlsx, .xls) hoặc .csv", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify("Dung lượng tệp vượt quá giới hạn cho phép (10MB)", "error");
      return;
    }
    setUploadedFile(file);
    notify(`Đã nhận diện tệp ${file.name} thành công`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const headers = "Mã nhân viên,Họ và tên NPT,Quan hệ,CCCD hoặc Mã định danh,Ngày sinh (DD/MM/YYYY),Hiệu lực từ (MM/YYYY),Hồ sơ đính kèm\n";
    const sample1 = `${employees[0]?.code || "NV-001"},Nguyễn Gia Hân,Con,079221005544,25/03/2021,08/2026,Giay_Khai_Sinh.pdf\n`;
    const sample2 = `${employees[0]?.code || "NV-001"},Nguyễn Minh Quân,Con,079223007788,10/11/2023,08/2026,CCCD_2Mat.pdf\n`;
    const blob = new Blob(["\uFEFF" + headers + sample1 + sample2], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mau_Danh_Sach_Nguoi_Phu_Thuoc.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Đã tải xuống file mẫu import");
  };

  // Declare file handlers
  const handleDeclareFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const valid = [".jpg", ".jpeg", ".png", ".pdf"];
      if (!valid.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        notify("Vui lòng chọn hình ảnh (.jpg, .png) hoặc tệp .pdf", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        notify("Dung lượng tệp vượt quá giới hạn 10MB", "error");
        return;
      }
      setDeclareFile(file);
      if (file.type.startsWith("image/")) {
        setDeclareFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setDeclareFilePreviewUrl(null);
      }
      notify(`Đã đính kèm tệp ${file.name}`);
    }
  };

  const handleRemoveDeclareFile = () => {
    setDeclareFile(null);
    if (declareFilePreviewUrl) {
      URL.revokeObjectURL(declareFilePreviewUrl);
      setDeclareFilePreviewUrl(null);
    }
    if (declareFileInputRef.current) {
      declareFileInputRef.current.value = "";
    }
  };

  // Dedicated Upload Document handlers
  const handleUploadDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const valid = [".jpg", ".jpeg", ".png", ".pdf"];
      if (!valid.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        notify("Vui lòng chọn hình ảnh (.jpg, .png) hoặc tệp .pdf", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        notify("Dung lượng tệp vượt quá giới hạn 10MB", "error");
        return;
      }
      setUploadDocFile(file);
      if (file.type.startsWith("image/")) {
        setUploadDocPreviewUrl(URL.createObjectURL(file));
      } else {
        setUploadDocPreviewUrl(null);
      }
      notify(`Đã nhận diện tệp ${file.name}`);
    }
  };

  const handleRemoveUploadDocFile = () => {
    setUploadDocFile(null);
    if (uploadDocPreviewUrl) {
      URL.revokeObjectURL(uploadDocPreviewUrl);
      setUploadDocPreviewUrl(null);
    }
    if (uploadDocInputRef.current) {
      uploadDocInputRef.current.value = "";
    }
  };

  // Query
  const dependentsQuery = useQuery({
    queryKey: ["dependents", projectId],
    queryFn: () => api.getDependents({ projectId: projectId === "all" ? undefined : projectId }),
  });

  const dependents = dependentsQuery.data ?? [];

  // Filtered list
  const filteredDependents = useMemo(() => {
    return dependents.filter((item) => {
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      const matchRelationship = relationshipFilter === "all" || item.relationship === relationshipFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.fullName.toLowerCase().includes(term) ||
        item.employeeName.toLowerCase().includes(term) ||
        item.employeeCode.toLowerCase().includes(term) ||
        item.idCardOrTaxCode.includes(term);
      return matchStatus && matchRelationship && matchSearch;
    });
  }, [dependents, statusFilter, relationshipFilter, searchTerm]);

  const pendingItems = useMemo(
    () => filteredDependents.filter((d) => d.status === "pending_approval"),
    [filteredDependents]
  );

  const pendingCount = useMemo(() => dependents.filter((d) => d.status === "pending_approval").length, [dependents]);
  const approvedCount = useMemo(() => dependents.filter((d) => d.status === "approved").length, [dependents]);
  const rejectedCount = useMemo(() => dependents.filter((d) => d.status === "rejected").length, [dependents]);

  const isAllPendingSelected =
    pendingItems.length > 0 && pendingItems.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    if (isAllPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((item) => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const isFilterActive = searchTerm || statusFilter !== "all" || relationshipFilter !== "all";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedDependents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDependents.slice(start, start + pageSize);
  }, [filteredDependents, page, pageSize]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRelationshipFilter("all");
    setPage(1);
  };

  // Mutations
  const createDeclareMutation = useMutation({
    mutationFn: async () => {
      if (!formEmployeeId || !formFullName || !formIdCard) {
        throw new Error("Vui lòng điền đầy đủ các trường bắt buộc.");
      }
      const emp = employees.find((e) => e.id === formEmployeeId);
      return api.createDependent({
        employeeId: formEmployeeId,
        employeeCode: emp?.code ?? "",
        employeeName: emp?.name ?? "",
        projectId: emp?.projectId ?? projectId,
        fullName: formFullName,
        relationship: formRelationship,
        dob: formDob || "2020-01-01",
        idCardOrTaxCode: formIdCard,
        startDate: formStartDate,
        attachmentType: formAttachmentType,
        attachmentName: declareFile
          ? declareFile.name
          : formAttachmentType === "cccd_2_sided"
          ? `CCCD_2Mat_${formFullName.replace(/\s+/g, "")}.pdf`
          : formAttachmentType === "disability_cert"
          ? `Giay_Chung_Nhan_${formFullName.replace(/\s+/g, "")}.jpg`
          : `Giay_Khai_Sinh_${formFullName.replace(/\s+/g, "")}.pdf`,
        attachmentUrl:
          declareFilePreviewUrl ||
          "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
        creationMode: "bcsx_declare",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      queryClient.invalidateQueries({ queryKey: ["tax-configs"] });
      setDeclareModalOpen(false);
      resetForm();
      notify("Đã gửi phiếu khai báo người phụ thuộc thành công (Đang chờ Kế toán kiểm tra & duyệt)");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const updateAttachmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDependentForUpload) throw new Error("Chưa chọn người phụ thuộc");
      if (!uploadDocFile) throw new Error("Vui lòng chọn tệp đính kèm");
      return api.updateDependentAttachment(selectedDependentForUpload.id, {
        attachmentType: uploadDocType,
        attachmentName: uploadDocFile.name,
        attachmentUrl:
          uploadDocPreviewUrl ||
          selectedDependentForUpload.attachmentUrl ||
          "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      setUploadAttachmentModalOpen(false);
      handleRemoveUploadDocFile();
      setSelectedDependentForUpload(null);
      notify("Đã cập nhật hồ sơ đính kèm thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const handleOpenEditModal = (item: Dependent) => {
    setEditingDependent(item);
    setEditFullName(item.fullName || "");
    setEditRelationship(item.relationship || "child");
    setEditDob(item.dob || "");
    setEditIdCard(item.idCardOrTaxCode || "");
    setEditTaxCode(item.taxCode || "");
    setEditStartDate(item.startDate || "2026-08");
    setEditEndDate(item.endDate || "");
    setEditAttachmentType(item.attachmentType || "cccd_2_sided");
    setEditModalOpen(true);
  };

  const updateDependentMutation = useMutation({
    mutationFn: async () => {
      if (!editingDependent) return;
      return api.updateDependent(editingDependent.id, {
        fullName: editFullName,
        relationship: editRelationship,
        dob: editDob,
        idCardOrTaxCode: editIdCard,
        taxCode: editTaxCode || undefined,
        startDate: editStartDate,
        endDate: editEndDate || undefined,
        attachmentType: editAttachmentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      queryClient.invalidateQueries({ queryKey: ["tax-configs"] });
      setEditModalOpen(false);
      setEditingDependent(null);
      notify("Đã cập nhật thông tin người phụ thuộc thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const confirmMutation = useMutation({
    mutationFn: async (ids: string[]) => api.confirmDependents(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      queryClient.invalidateQueries({ queryKey: ["tax-configs"] });
      setSelectedIds(new Set());
      setPreviewModalOpen(false);
      setConfirmModalOpen(false);
      setConfirmTargetDependent(null);
      notify("Đã xác nhận hồ sơ Người phụ thuộc thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => api.rejectDependent(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      queryClient.invalidateQueries({ queryKey: ["tax-configs"] });
      setRejectModalOpen(false);
      setRejectionReason("");
      setSelectedDependent(null);
      notify("Đã từ chối hồ sơ người phụ thuộc", "warning");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      // Mock importing records
      const targetProj = projectId === "all" ? (employees[0]?.projectId ?? "prj-jss") : projectId;
      const targetEmp = employees.find((e) => e.projectId === targetProj) ?? employees[0];
      const items: Partial<Dependent>[] = [
        {
          employeeId: targetEmp.id,
          employeeCode: targetEmp.code,
          employeeName: targetEmp.name,
          fullName: "Nguyễn Gia Hân",
          relationship: "child",
          dob: "2021-03-25",
          idCardOrTaxCode: "079221005544",
          startDate: "2026-08",
          attachmentType: "birth_cert",
          attachmentName: "Giay_Khai_Sinh_NguyenGiaHan.pdf",
        },
        {
          employeeId: targetEmp.id,
          employeeCode: targetEmp.code,
          employeeName: targetEmp.name,
          fullName: "Nguyễn Minh Quân",
          relationship: "child",
          dob: "2023-10-10",
          idCardOrTaxCode: "079223007788",
          startDate: "2026-08",
          attachmentType: "cccd_2_sided",
          attachmentName: "CCCD_NguyenMinhQuan.pdf",
        },
      ];
      const imported = await api.importDependents({ projectId: targetProj, items });
      const ids = imported.map((i) => i.id);
      await api.confirmDependents(ids, "Trần Thu Trang (Kế toán import & duyệt)");
      return imported;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependents"] });
      queryClient.invalidateQueries({ queryKey: ["tax-configs"] });
      setImportModalOpen(false);
      handleRemoveFile();
      notify("Đã import và xác nhận thông tin chính xác thành công!");
    },
    onError: (err: Error) => notify(err.message, "error"),
  });

  const resetForm = () => {
    setFormEmployeeId("");
    setFormFullName("");
    setFormRelationship("child");
    setFormDob("");
    setFormIdCard("");
    setFormStartDate("2026-08");
    setFormAttachmentType("cccd_2_sided");
    handleRemoveDeclareFile();
  };

  const relationshipLabel = (rel: string) => {
    switch (rel) {
      case "child":
        return "Con ruột / Con nuôi";
      case "spouse":
        return "Vợ / Chồng";
      case "parent":
        return "Cha / Mẹ";
      default:
        return "Người phụ thuộc khác";
    }
  };

  if (dependentsQuery.isLoading) return <LoadingBlock rows={6} />;
  if (dependentsQuery.isError) return <ErrorState message="Không thể tải danh sách người phụ thuộc" retry={() => dependentsQuery.refetch()} />;

  return (
    <div className="dependents-subtab">
      {/* Integrated Single Card: Toolbar + Filters + Data Table */}
      <div className="integrated-table-card">
        {/* Table Card Toolbar */}
        <div className="table-card-toolbar">
          {/* Top Row: Search & Inputs on Left, Actions on Right */}
          <div className="filter-panel-top">
            <div className="filter-panel-inputs">
              <label className="search-field">
                <Search />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên NPT, tên NV, mã NV, CCCD..."
                />
              </label>

              <select
                className="filter-select"
                value={relationshipFilter}
                onChange={(e) => setRelationshipFilter(e.target.value)}
                aria-label="Lọc theo quan hệ nhân thân"
              >
                <option value="all">Tất cả mối quan hệ</option>
                <option value="child">Con ruột / Con nuôi</option>
                <option value="spouse">Vợ / Chồng</option>
                <option value="parent">Cha / Mẹ</option>
                <option value="other">Người phụ thuộc khác</option>
              </select>
            </div>

            <div className="filter-panel-actions">
              {/* If Accountant: Show Batch Actions & Import Excel */}
              {isAccountant ? (
                <>
                  {selectedIds.size > 0 ? (
                    <div className="bulk-action-group">
                      <Badge tone="info">Đã tích chọn {selectedIds.size} hồ sơ</Badge>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setConfirmTargetIds(Array.from(selectedIds));
                          setConfirmTargetDependent(null);
                          setConfirmModalOpen(true);
                        }}
                        loading={confirmMutation.isPending}
                      >
                        <CheckCheck /> Xác nhận {selectedIds.size} hồ sơ đã chọn
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                        Bỏ chọn
                      </Button>
                    </div>
                  ) : (
                    pendingCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const pendingIds = dependents.filter((d) => d.status === "pending_approval").map((d) => d.id);
                          setConfirmTargetIds(pendingIds);
                          setConfirmTargetDependent(null);
                          setConfirmModalOpen(true);
                        }}
                        loading={confirmMutation.isPending}
                      >
                        <CheckCheck /> Xác nhận tất cả ({pendingCount})
                      </Button>
                    )
                  )}
                  <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                    <Upload /> Import danh sách NPT
                  </Button>
                </>
              ) : (
                /* If BCSX: Show Declare Button */
                <Button variant="primary" onClick={() => setDeclareModalOpen(true)}>
                  <Plus /> Khai báo người phụ thuộc
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Row: Status Segmentation Pills on Left, Result Count on Right */}
          <div className="filter-panel-bottom">
            <div className="filter-status-pills">
              <button
                type="button"
                className={`pill-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                Tất cả ({dependents.length})
              </button>
              <button
                type="button"
                className={`pill-btn warning ${statusFilter === "pending_approval" ? "active" : ""}`}
                onClick={() => setStatusFilter("pending_approval")}
              >
                Đang xử lý ({pendingCount})
              </button>
              <button
                type="button"
                className={`pill-btn success ${statusFilter === "approved" ? "active" : ""}`}
                onClick={() => setStatusFilter("approved")}
              >
                Xác nhận ({approvedCount})
              </button>
              <button
                type="button"
                className={`pill-btn danger ${statusFilter === "rejected" ? "active" : ""}`}
                onClick={() => setStatusFilter("rejected")}
              >
                Từ chối ({rejectedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Dependents Table */}
        {filteredDependents.length === 0 ? (
          <EmptyState
            title="Chưa có người phụ thuộc"
            description={
              searchTerm
                ? "Không tìm thấy người phụ thuộc phù hợp với từ khóa."
                : isAccountant
                ? "Nhấn 'Import danh sách NPT' để tải lên danh sách người phụ thuộc từ Excel."
                : "Nhấn 'Khai báo người phụ thuộc' để gửi hồ sơ người phụ thuộc lên kế toán xác nhận."
            }
            action={
              !searchTerm ? (
                isAccountant ? (
                  <Button variant="primary" onClick={() => setImportModalOpen(true)}>
                    <Upload /> Import danh sách NPT
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setDeclareModalOpen(true)}>
                    <Plus /> Khai báo người phụ thuộc
                  </Button>
                )
              ) : undefined
            }
          />
        ) : (
          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table">
              <thead>
                <tr>
                  {isAccountant && (
                    <th style={{ width: "40px" }} className="text-center">
                      <input
                        type="checkbox"
                        checked={isAllPendingSelected}
                        onChange={toggleSelectAll}
                        disabled={pendingItems.length === 0}
                        title="Chọn tất cả hồ sơ đang xử lý"
                      />
                    </th>
                  )}
                  <th style={{ width: "45px" }} className="text-center">STT</th>
                  <th style={{ minWidth: "160px" }}>NGƯỜI LAO ĐỘNG</th>
                  <th>CCCD NNT</th>
                  <th>MST NNT</th>
                  <th>HỌ TÊN NPT</th>
                  <th>MST NPT</th>
                  <th>NGÀY SINH</th>
                  <th>CCCD NPT</th>
                  <th>QUAN HỆ</th>
                  <th>NGÀY ÁP DỤNG</th>
                  <th>NGÀY KẾT THÚC</th>
                  <th style={{ width: "120px" }}>TRẠNG THÁI</th>
                  <th style={{ width: "60px" }} className="text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDependents.map((item, idx) => {
                  const isPending = item.status === "pending_approval";
                  const isApproved = item.status === "approved";
                  const isSelected = selectedIds.has(item.id);
                  const stt = (page - 1) * pageSize + idx + 1;
                  const emp = employeeMap.get(item.employeeId);
                  const projectCode = item.projectCode || emp?.projectCode;

                  return (
                    <tr
                      key={item.id}
                      className={
                        isSelected
                          ? "highlight-selected-row"
                          : isPending
                          ? "highlight-pending-row"
                          : undefined
                      }
                    >
                      {isAccountant && (
                        <td className="text-center">
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(item.id)}
                            />
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="text-center text-muted font-medium">{stt}</td>
                      <td>
                        <div className="employee-cell-info">
                          <span className="employee-cell-name font-semibold">{item.employeeName || emp?.name || "—"}</span>
                          <span className="employee-cell-sub">
                            <span className="employee-code-badge">{item.employeeCode || emp?.code || "—"}</span>
                            {projectCode && <span className="text-muted text-[11px] font-normal">· {projectCode}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-xs">
                        {item.employeeIdCard || emp?.idCard || "—"}
                      </td>
                      <td className="font-mono text-xs">
                        {item.employeeTaxCode || (emp?.idCard ? `80${emp.idCard.slice(-8)}` : "—")}
                      </td>
                      <td>
                        <strong className="text-foreground font-semibold">{item.fullName}</strong>
                      </td>
                      <td className="font-mono text-xs">
                        {item.taxCode || "—"}
                      </td>
                      <td>{formatDate(item.dob)}</td>
                      <td className="font-mono text-xs">
                        {item.idCardOrTaxCode || "—"}
                      </td>
                      <td>{relationshipLabel(item.relationship)}</td>
                      <td>
                        <Badge tone="neutral">{formatMonthYear(item.startDate)}</Badge>
                      </td>
                      <td>
                        {item.endDate ? (
                          <Badge tone="neutral">{formatMonthYear(item.endDate)}</Badge>
                        ) : (
                          <span className="text-muted text-xs">Vô thời hạn</span>
                        )}
                      </td>
                      <td>
                        {isPending ? (
                          <StatusBadge tone="warning">Đang xử lý</StatusBadge>
                        ) : isApproved ? (
                          <StatusBadge tone="success">Xác nhận</StatusBadge>
                        ) : (
                          <StatusBadge tone="danger">Từ chối</StatusBadge>
                        )}
                      </td>
                      <td className="text-center">
                        <TableRowActions
                          items={[
                            ...(isAccountant && isPending
                              ? [
                                  {
                                    key: "approve",
                                    label: "Xác nhận hồ sơ",
                                    icon: <Check />,
                                    onClick: () => {
                                      setConfirmTargetIds([item.id]);
                                      setConfirmTargetDependent(item);
                                      setConfirmModalOpen(true);
                                    },
                                  },
                                  {
                                    key: "reject",
                                    label: "Từ chối hồ sơ",
                                    icon: <X />,
                                    danger: true,
                                    onClick: () => {
                                      setSelectedDependent(item);
                                      setRejectModalOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            {
                              key: "edit",
                              label: "Chỉnh sửa thông tin",
                              icon: <Pencil />,
                              onClick: () => handleOpenEditModal(item),
                            },
                            ...(item.attachmentName && item.attachmentName.trim() !== ""
                              ? [
                                  {
                                    key: "preview",
                                    label: "Xem chứng từ",
                                    icon: <Eye />,
                                    onClick: () => {
                                      setSelectedDependent(item);
                                      setPreviewModalOpen(true);
                                    },
                                  },
                                ]
                              : []),
                            {
                              key: "upload",
                              label: item.attachmentName ? "Cập nhật chứng từ" : "Tải lên chứng từ",
                              icon: <UploadCloud />,
                              onClick: () => {
                                setSelectedDependentForUpload(item);
                                setUploadDocType(item.attachmentType || "cccd_2_sided");
                                setUploadAttachmentModalOpen(true);
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Attached Table Footer */}
          <TablePaginationFooter
            totalItems={filteredDependents.length}
            selectedCount={selectedIds.size}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>

      {/* Modal 1: BCSX Khai báo NPT */}
      <Modal
        open={declareModalOpen}
        onOpenChange={setDeclareModalOpen}
        title="Khai Báo Người Phụ Thuộc"
        description="Thu thập thông tin người phụ thuộc của người lao động và tải kèm hình ảnh hồ sơ chứng minh."
        size="md"
        footer={
          <>
            <Button onClick={() => setDeclareModalOpen(false)}>Hủy</Button>
            <Button variant="primary" loading={createDeclareMutation.isPending} onClick={() => createDeclareMutation.mutate()}>
              <Plus /> Gửi kế toán duyệt
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-field full-width">
            <span>Chọn Người lao động *</span>
            <SearchableSelect
              value={formEmployeeId}
              onChange={setFormEmployeeId}
              placeholder="-- Chọn nhân viên trong danh sách --"
              searchPlaceholder="Tìm theo tên hoặc mã NV..."
              options={employees.map((emp) => ({
                value: emp.id,
                label: `${emp.code} - ${emp.name}`,
                subLabel: emp.department,
              }))}
            />
          </div>

          <label className="form-field">
            <span>Họ và tên Người phụ thuộc *</span>
            <input
              type="text"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              placeholder="VD: Nguyễn Bảo Long"
              required
            />
          </label>

          <label className="form-field">
            <span>Mối quan hệ nhân thân *</span>
            <select
              value={formRelationship}
              onChange={(e) => setFormRelationship(e.target.value as any)}
            >
              <option value="child">Con ruột / Con nuôi</option>
              <option value="spouse">Vợ / Chồng</option>
              <option value="parent">Cha / Mẹ ruột hoặc Cha/Mẹ chồng/vợ</option>
              <option value="other">Người phụ thuộc khác (Nuôi dưỡng trực tiếp)</option>
            </select>
          </label>

          <label className="form-field">
            <span>Ngày tháng năm sinh *</span>
            <input
              type="date"
              value={formDob}
              onChange={(e) => setFormDob(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Số CCCD / Mã số định danh / MST *</span>
            <input
              type="text"
              value={formIdCard}
              onChange={(e) => setFormIdCard(e.target.value)}
              placeholder="12 số CCCD hoặc Mã định danh"
              required
            />
          </label>

          <div className="form-field">
            <span>Tháng bắt đầu tính giảm trừ *</span>
            <MonthPicker
              value={formStartDate}
              onChange={(val) => setFormStartDate(val)}
              variant="form"
            />
          </div>

          <label className="form-field full-width">
            <span>Loại giấy tờ chứng minh đính kèm *</span>
            <select
              value={formAttachmentType}
              onChange={(e) => setFormAttachmentType(e.target.value as any)}
            >
              <option value="cccd_2_sided">Hình chụp CCCD 2 mặt (Mặt trước + Mặt sau)</option>
              <option value="birth_cert">Giấy khai sinh (Trẻ em dưới 18 tuổi)</option>
              <option value="disability_cert">Giấy chứng nhận mất khả năng lao động / Y tế</option>
            </select>
          </label>

          {/* Dedicated File Upload Section in Declare Modal */}
          <div className="full-width space-y-2">
            <span className="text-xs font-semibold text-foreground block">
              Tải lên tài liệu chứng minh (Hình ảnh hoặc PDF)
            </span>
            <input
              ref={declareFileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleDeclareFileChange}
              className="hidden"
            />
            {!declareFile ? (
              <div
                onClick={() => declareFileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 bg-card hover:bg-secondary/30 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <strong className="text-xs font-bold text-foreground block">
                    Bấm để chọn tệp chứng minh từ máy tính
                  </strong>
                  <p className="text-[11px] text-muted">
                    Hỗ trợ <strong>JPG, PNG, PDF</strong> (tối đa 10MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    {declareFile.type.startsWith("image/") ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-xs font-bold text-foreground truncate block">
                      {declareFile.name}
                    </strong>
                    <small className="text-[11px] text-muted block">
                      {(declareFile.size / 1024).toFixed(1)} KB · Sẵn sàng đính kèm
                    </small>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => declareFileInputRef.current?.click()}
                    className="text-xs"
                  >
                    Thay tệp
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveDeclareFile}
                    className="text-destructive hover:bg-destructive/10 text-xs"
                    title="Gỡ tệp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal 2: Kế toán Import Excel */}
      <Modal
        open={importModalOpen}
        onOpenChange={(open) => {
          setImportModalOpen(open);
          if (!open) handleRemoveFile();
        }}
        title="Import Danh Sách Người Phụ Thuộc"
        description="Tải lên tệp Excel danh sách NPT theo mẫu chuẩn của hệ thống. Kế toán kiểm tra dữ liệu và bấm xác nhận để lưu."
        size="lg"
        footer={
          <>
            <Button onClick={() => setImportModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              disabled={!uploadedFile}
              loading={importMutation.isPending}
              onClick={() => importMutation.mutate()}
            >
              <UserCheck /> Xác nhận thông tin chính xác &amp; Lưu hệ thống
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Header Template Download Link */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border text-xs">
            <div className="flex items-center gap-2 text-muted">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>Chưa có tệp mẫu chuẩn? Tải về mẫu Excel để điền dữ liệu:</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline hover:text-primary-focus shrink-0 ml-2"
            >
              <Download className="w-3.5 h-3.5" />
              Tải file mẫu (.xlsx / .csv)
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Dropzone */}
          {!uploadedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border hover:border-primary/60 bg-card hover:bg-secondary/30"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-bold text-foreground block">
                  Kéo và thả tệp Excel vào đây, hoặc <span className="text-primary underline">bấm để chọn tệp</span>
                </strong>
                <p className="text-xs text-muted">
                  Hỗ trợ định dạng: <strong>.xlsx, .xls, .csv</strong> · Dung lượng tối đa: 10MB
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1 pointer-events-none"
              >
                <Upload className="w-3.5 h-3.5" /> Chọn tệp từ máy tính
              </Button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-foreground truncate block">
                      {uploadedFile.name}
                    </strong>
                    <Badge tone="success">
                      <FileCheck className="w-3 h-3 inline mr-1" />
                      Đã tải lên
                    </Badge>
                  </div>
                  <small className="text-[11px] text-muted block">
                    Dung lượng: {(uploadedFile.size / 1024).toFixed(1)} KB · Nhận diện 2 bản ghi hợp lệ
                  </small>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Thay tệp
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  className="text-destructive hover:bg-destructive/10 text-xs"
                  title="Xóa tệp đã chọn"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Preview Table (Visible when file is uploaded) */}
          {uploadedFile && (
            <div className="preview-table-box space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-foreground">Xem trước dữ liệu import (2 dòng):</h5>
                <Badge tone="info">Khớp 100% cột dữ liệu</Badge>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="data-table compact-table">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ tên NPT</th>
                      <th>Quan hệ</th>
                      <th>CCCD / Mã định danh</th>
                      <th>Hiệu lực</th>
                      <th>Hồ sơ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>{employees[0]?.code || "NV-001"}</code></td>
                      <td>Nguyễn Gia Hân</td>
                      <td>Con</td>
                      <td>079221005544</td>
                      <td>Tháng 08/2026</td>
                      <td><span className="file-badge"><FileText className="w-3 h-3 inline mr-1" /> Giay_Khai_Sinh.pdf</span></td>
                    </tr>
                    <tr>
                      <td><code>{employees[0]?.code || "NV-001"}</code></td>
                      <td>Nguyễn Minh Quân</td>
                      <td>Con</td>
                      <td>079223007788</td>
                      <td>Tháng 08/2026</td>
                      <td><span className="file-badge"><FileText className="w-3 h-3 inline mr-1" /> CCCD_2Mat.pdf</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confirm Notice */}
          <div className="confirm-notice">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-xs">
              <strong>Lưu ý:</strong> Khi Kế toán nhấn <em>"Xác nhận thông tin chính xác &amp; Lưu hệ thống"</em>, danh sách người phụ thuộc sẽ được duyệt chính thức và tự động cộng dồn số lượng NPT vào bảng tính Thuế TNCN.
            </span>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Kế toán Từ chối hồ sơ */}
      <Modal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        title="Từ chối hồ sơ Người phụ thuộc"
        description={`Hồ sơ của NPT: ${selectedDependent?.fullName} (${selectedDependent?.employeeName})`}
        size="sm"
        footer={
          <>
            <Button onClick={() => setRejectModalOpen(false)}>Hủy</Button>
            <Button
              variant="danger"
              disabled={!rejectionReason.trim()}
              loading={rejectMutation.isPending}
              onClick={() => {
                if (selectedDependent) {
                  rejectMutation.mutate({ id: selectedDependent.id, reason: rejectionReason });
                }
              }}
            >
              <X /> Xác nhận Từ chối
            </Button>
          </>
        }
      >
        <div className="form-field full-width">
          <span>Lý do từ chối (Phản hồi đến người khai báo) *</span>
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="VD: Hình chụp CCCD bị mờ thông tin ngày sinh hoặc thiếu mặt sau. Vui lòng chụp lại."
            required
          />
        </div>
      </Modal>

      {/* Modal 4: Xem file đính kèm CCCD / Giấy chứng nhận */}
      {selectedDependent && (
        <AttachmentPreviewModal
          open={previewModalOpen}
          onOpenChange={setPreviewModalOpen}
          title={`Hồ sơ đính kèm: ${selectedDependent.fullName}`}
          attachmentName={selectedDependent.attachmentName}
          attachmentUrl={selectedDependent.attachmentUrl}
          attachmentType={selectedDependent.attachmentType}
          employeeName={`${selectedDependent.employeeCode} - ${selectedDependent.employeeName}`}
          dependentName={selectedDependent.fullName}
          dob={selectedDependent.dob}
          startDate={selectedDependent.startDate}
          onConfirm={
            isAccountant && selectedDependent.status === "pending_approval"
              ? () => confirmMutation.mutate([selectedDependent.id])
              : undefined
          }
          confirmLoading={confirmMutation.isPending}
          onReject={
            isAccountant && selectedDependent.status === "pending_approval"
              ? () => {
                  setRejectModalOpen(true);
                }
              : undefined
          }
          onUploadNew={() => {
            setSelectedDependentForUpload(selectedDependent);
            setUploadDocType(selectedDependent.attachmentType || "cccd_2_sided");
            setUploadAttachmentModalOpen(true);
          }}
        />
      )}

      {/* Modal 5: Tải Lên / Cập Nhật Hồ Sơ Đính Kèm Riêng */}
      <Modal
        open={uploadAttachmentModalOpen}
        onOpenChange={(open) => {
          setUploadAttachmentModalOpen(open);
          if (!open) handleRemoveUploadDocFile();
        }}
        title="Tải Lên / Cập Nhật Hồ Sơ Đính Kèm"
        description={`Hồ sơ của NPT: ${selectedDependentForUpload?.fullName || ""} (${selectedDependentForUpload?.employeeName || ""})`}
        size="md"
        footer={
          <>
            <Button onClick={() => setUploadAttachmentModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              disabled={!uploadDocFile}
              loading={updateAttachmentMutation.isPending}
              onClick={() => updateAttachmentMutation.mutate()}
            >
              <Check /> Lưu hồ sơ đính kèm
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="form-field full-width">
            <span>Loại tài liệu chứng minh *</span>
            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value as any)}
            >
              <option value="cccd_2_sided">Hình chụp CCCD 2 mặt (Mặt trước + Mặt sau)</option>
              <option value="birth_cert">Giấy khai sinh (Trẻ em dưới 18 tuổi)</option>
              <option value="disability_cert">Giấy chứng nhận mất khả năng lao động / Giám định y khoa</option>
            </select>
          </label>

          {/* Hidden File Input */}
          <input
            ref={uploadDocInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleUploadDocChange}
            className="hidden"
          />

          {!uploadDocFile ? (
            <div
              onClick={() => uploadDocInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 bg-card hover:bg-secondary/30 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <strong className="text-sm font-bold text-foreground block">
                  Bấm để chọn tệp tài liệu từ máy tính
                </strong>
                <p className="text-xs text-muted">
                  Hỗ trợ định dạng: <strong>JPG, PNG, PDF</strong> · Dung lượng tối đa: 10MB
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" className="mt-1 pointer-events-none">
                <Upload className="w-3.5 h-3.5" /> Chọn tệp hình ảnh/PDF
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    {uploadDocFile.type.startsWith("image/") ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <strong className="text-xs font-bold text-foreground truncate block">
                      {uploadDocFile.name}
                    </strong>
                    <small className="text-[11px] text-muted block">
                      Dung lượng: {(uploadDocFile.size / 1024).toFixed(1)} KB · Sẵn sàng cập nhật
                    </small>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => uploadDocInputRef.current?.click()}
                    className="text-xs"
                  >
                    Thay tệp
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveUploadDocFile}
                    className="text-destructive hover:bg-destructive/10 text-xs"
                    title="Gỡ tệp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Image thumbnail preview if image */}
              {uploadDocPreviewUrl && (
                <div className="rounded-lg overflow-hidden border border-border/80 max-h-48 flex items-center justify-center bg-black/5">
                  <img src={uploadDocPreviewUrl} alt="Xem trước hồ sơ" className="max-h-48 object-contain" />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Approval Modal */}
      <Modal
        open={confirmModalOpen}
        onOpenChange={(open) => !open && setConfirmModalOpen(false)}
        title="Xác nhận hồ sơ Người phụ thuộc"
        description={
          confirmTargetDependent
            ? `Xác nhận hồ sơ người phụ thuộc cho nhân viên ${confirmTargetDependent.employeeName} (${confirmTargetDependent.employeeCode})`
            : `Bạn có chắc chắn muốn xác nhận ${confirmTargetIds.length} hồ sơ người phụ thuộc đã chọn?`
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(confirmTargetIds)}
            >
              <Check /> Xác nhận hồ sơ
            </Button>
          </>
        }
      >
        {confirmTargetDependent ? (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-secondary/50 rounded-lg space-y-2 border border-border">
              <div className="flex justify-between">
                <span className="text-muted">Người nộp thuế:</span>
                <strong className="text-foreground">{confirmTargetDependent.employeeName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Người phụ thuộc:</span>
                <strong className="text-foreground">{confirmTargetDependent.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Mối quan hệ:</span>
                <span>{relationshipLabel(confirmTargetDependent.relationship)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tháng áp dụng:</span>
                <Badge tone="neutral">{formatMonthYear(confirmTargetDependent.startDate)}</Badge>
              </div>
            </div>
            <p className="text-muted leading-relaxed">
              Sau khi xác nhận, người phụ thuộc này sẽ được tính vào mức giảm trừ gia cảnh của nhân viên từ tháng áp dụng.
            </p>
          </div>
        ) : (
          <p className="modal-note">
            Toàn bộ {confirmTargetIds.length} hồ sơ người phụ thuộc được chọn sẽ được chuyển sang trạng thái Đã xác nhận và tự động liên kết với Thuế TNCN.
          </p>
        )}
      </Modal>

      {/* Edit Dependent Modal */}
      <Modal
        open={editModalOpen}
        onOpenChange={(open) => !open && setEditModalOpen(false)}
        title="Chỉnh sửa thông tin Người phụ thuộc"
        description={editingDependent ? `Người nộp thuế: ${editingDependent.employeeName} (${editingDependent.employeeCode})` : ""}
        size="md"
        footer={
          <>
            <Button onClick={() => setEditModalOpen(false)}>Hủy</Button>
            <Button
              variant="primary"
              loading={updateDependentMutation.isPending}
              onClick={() => updateDependentMutation.mutate()}
            >
              <Check /> Lưu thay đổi
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <label className="form-field">
            <span>Họ và tên Người phụ thuộc *</span>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="Họ và tên NPT"
              required
            />
          </label>

          <label className="form-field">
            <span>Mối quan hệ nhân thân *</span>
            <select
              value={editRelationship}
              onChange={(e) => setEditRelationship(e.target.value as any)}
            >
              <option value="child">Con ruột / Con nuôi</option>
              <option value="spouse">Vợ / Chồng</option>
              <option value="parent">Cha / Mẹ ruột hoặc Cha/Mẹ chồng/vợ</option>
              <option value="other">Người phụ thuộc khác</option>
            </select>
          </label>

          <label className="form-field">
            <span>Ngày tháng năm sinh *</span>
            <input
              type="date"
              value={editDob}
              onChange={(e) => setEditDob(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>Số CCCD / Mã số định danh *</span>
            <input
              type="text"
              value={editIdCard}
              onChange={(e) => setEditIdCard(e.target.value)}
              placeholder="12 số CCCD / Mã định danh"
              required
            />
          </label>

          <label className="form-field">
            <span>Mã số thuế NPT (nếu có)</span>
            <input
              type="text"
              value={editTaxCode}
              onChange={(e) => setEditTaxCode(e.target.value)}
              placeholder="Mã số thuế NPT"
            />
          </label>

          <div className="form-field">
            <span>Tháng bắt đầu tính giảm trừ *</span>
            <MonthPicker
              value={editStartDate}
              onChange={(val) => setEditStartDate(val)}
              variant="form"
            />
          </div>

          <div className="form-field">
            <span>Tháng kết thúc giảm trừ</span>
            <MonthPicker
              value={editEndDate || "2026-12"}
              onChange={(val) => setEditEndDate(val)}
              variant="form"
            />
          </div>

          <label className="form-field full-width">
            <span>Loại giấy tờ chứng minh đính kèm</span>
            <select
              value={editAttachmentType}
              onChange={(e) => setEditAttachmentType(e.target.value as any)}
            >
              <option value="cccd_2_sided">Hình chụp CCCD 2 mặt (Mặt trước + Mặt sau)</option>
              <option value="birth_cert">Giấy khai sinh (Trẻ em dưới 18 tuổi)</option>
              <option value="disability_cert">Giấy chứng nhận mất khả năng lao động / Y tế</option>
            </select>
          </label>
        </div>
      </Modal>
    </div>
  );
}

