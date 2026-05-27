import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import styles from './CreateReceiptAI.module.css';

type StepState = 1 | 2 | 3;
type UploadMode = 'upload' | 'manual';

const initialSlipData = {
  date: '',
  category: '',
  shop: '',
  amount: '',
  details: '',
};

export default function CreateReceiptAI() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('upload');
  const [step, setStep] = useState<StepState>(1);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [slipData, setSlipData] = useState(initialSlipData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCreateDisabled = useMemo(() => {
    if (uploadMode === 'manual') {
      return !slipData.date || !slipData.shop || !slipData.amount;
    }
    return step !== 3;
  }, [uploadMode, step, slipData]);

  const handleModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    if (mode === 'manual') {
      setStep(3);
      setReceiptImage(null);
      setSlipData(initialSlipData);
    } else {
      setStep(1);
      setSlipData(initialSlipData);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setReceiptImage(imageUrl);
    setStep(2);
    setUploadMode('upload');
  };

  const handleProcessAI = () => {
    if (!receiptImage) return;
    setIsProcessing(true);

    window.setTimeout(() => {
      setSlipData({
        date: '2026-05-18',
        category: 'อาหาร',
        shop: 'ร้านอาหารกราฟิก',
        amount: '1,250.00',
        details: 'ค่าอาหารและเครื่องดื่ม พร้อมค่าบริการบริการจัดส่ง',
      });
      setStep(3);
      setIsProcessing(false);
    }, 1600);
  };

  const handleCancel = () => {
    setUploadMode('upload');
    setStep(1);
    setReceiptImage(null);
    setSlipData(initialSlipData);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreateExpense = () => {
    if (isCreateDisabled) return;
    alert('สร้างรายจ่ายสำเร็จ!');
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentCard}>
        <section className={styles.previewPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelSubtitle}>Preview ใบเสร็จ</p>
              <h2 className={styles.panelTitle}>ภาพตัวอย่างใบเสร็จ</h2>
            </div>
          </div>

          <div className={styles.toolbar} role="toolbar" aria-label="เครื่องมือรูปภาพ">
            <button type="button" className={styles.toolbarButton} aria-label="ย่อ">−</button>
            <button type="button" className={styles.toolbarButton} aria-label="ขยาย">+</button>
            <button type="button" className={styles.toolbarButton} aria-label="พอดีหน้าจอ">⤢</button>
          </div>

          <div className={styles.previewFrame}>
            {receiptImage ? (
              <img src={receiptImage} alt="Preview ใบเสร็จ" />
            ) : (
              <div className={styles.previewPlaceholder}>ยังไม่มีภาพใบเสร็จ</div>
            )}
          </div>

          <div className={styles.statusCard}>
            <p className={styles.statusTitle}>สถานะปัจจุบัน</p>
            <div className={styles.statusMeta}>
              <span className={styles.statusBadge}>Step {step}</span>
              <span>
                {step === 1 && 'รออัปโหลดไฟล์'}
                {step === 2 && 'อัปโหลดแล้ว รอประมวลผล AI'}
                {step === 3 && 'อ่านข้อมูลสำเร็จ'}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelSubtitle}>สร้างใบเสร็จด้วย AI</p>
              <h2 className={styles.panelTitle}>เพิ่มข้อมูลสลิป</h2>
            </div>
          </div>

          <div className={styles.formCard}>
            <div className={styles.fieldGroup}>
              <p className={styles.fieldLabel}>วิธีการอัปโหลดรายจ่าย</p>
              <div className={styles.fieldGrid}>
                <button
                  type="button"
                  className={
                    uploadMode === 'upload'
                      ? `${styles.button} ${styles.saveButton}`
                      : styles.button
                  }
                  onClick={() => handleModeChange('upload')}
                >
                  อัปโหลดไฟล์
                </button>
                <button
                  type="button"
                  className={
                    uploadMode === 'manual'
                      ? `${styles.button} ${styles.saveButton}`
                      : styles.button
                  }
                  onClick={() => handleModeChange('manual')}
                >
                  กรอกข้อมูลเอง
                </button>
              </div>
            </div>

            {uploadMode === 'upload' && step !== 3 ? (
              <div className={styles.fieldGroup}>
                <label htmlFor="receipt-file" className={styles.uploadDropZone}>
                  <span className={styles.panelSubtitle}>ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด</span>
                  <input
                    id="receipt-file"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className={styles.fileInputHidden}
                    onChange={handleFileSelect}
                  />
                </label>
                {step === 2 && (
                  <div className={styles.fieldGroup}>
                    <p className={styles.statusTitle}>อัปโหลดแล้ว</p>
                    <p className={styles.previewPlaceholder}>กดปุ่มด้านล่างเพื่อให้ AI อ่านข้อมูลจากใบเสร็จ</p>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.saveButton}`}
                      disabled={isProcessing}
                      onClick={handleProcessAI}
                    >
                      {isProcessing ? 'กำลังประมวลผล...' : 'ประมวลผลด้วย AI'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.fieldGroup}>
                <div className={styles.fieldGrid}>
                  <label className={styles.fieldHalf} htmlFor="receipt-date">
                    <span className={styles.fieldLabel}>วันที่</span>
                    <input
                      id="receipt-date"
                      type="date"
                      value={slipData.date}
                      onChange={(event) => setSlipData({ ...slipData, date: event.target.value })}
                      className={styles.fieldInput}
                    />
                  </label>

                  <label className={styles.fieldHalf} htmlFor="receipt-category">
                    <span className={styles.fieldLabel}>หมวดหมู่</span>
                    <input
                      id="receipt-category"
                      type="text"
                      value={slipData.category}
                      onChange={(event) => setSlipData({ ...slipData, category: event.target.value })}
                      placeholder="เช่น อาหาร, เดินทาง"
                      className={styles.fieldInput}
                    />
                  </label>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.fieldHalf} htmlFor="receipt-shop">
                    <span className={styles.fieldLabel}>ร้านค้า</span>
                    <input
                      id="receipt-shop"
                      type="text"
                      value={slipData.shop}
                      onChange={(event) => setSlipData({ ...slipData, shop: event.target.value })}
                      placeholder="ชื่อร้านค้า"
                      className={styles.fieldInput}
                    />
                  </label>

                  <label className={styles.fieldHalf} htmlFor="receipt-amount">
                    <span className={styles.fieldLabel}>จำนวนเงิน</span>
                    <input
                      id="receipt-amount"
                      type="text"
                      value={slipData.amount}
                      onChange={(event) => setSlipData({ ...slipData, amount: event.target.value })}
                      placeholder="0.00"
                      className={styles.fieldInput}
                    />
                  </label>
                </div>

                <label className={styles.fieldFull} htmlFor="receipt-details">
                  <span className={styles.fieldLabel}>รายละเอียด</span>
                  <textarea
                    id="receipt-details"
                    value={slipData.details}
                    onChange={(event) => setSlipData({ ...slipData, details: event.target.value })}
                    placeholder="เพิ่มรายละเอียดสลิป เช่น เมนูหรือวัตถุประสงค์"
                    className={styles.fieldTextarea}
                  />
                </label>
              </div>
            )}

            <div className={styles.actionRow}>
              <button type="button" className={`${styles.button} ${styles.cancelButton}`} onClick={handleCancel}>
                ยกเลิก
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.saveButton}`}
                onClick={handleCreateExpense}
                disabled={isCreateDisabled}
              >
                สร้างรายจ่าย
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
