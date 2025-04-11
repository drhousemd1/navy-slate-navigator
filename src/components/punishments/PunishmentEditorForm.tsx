import React, { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { PunishmentData } from "@/contexts/PunishmentsContext";
import PunishmentBasicDetails from "./form/PunishmentBasicDetails";
import PunishmentIconSection from "./form/PunishmentIconSection";
import PunishmentColorSettings from "./PunishmentColorSettings";
import PunishmentFormActions from "./form/PunishmentFormActions";
import PunishmentFormProvider from "./form/PunishmentFormProvider";
import PunishmentFormSubmitHandler from "./form/PunishmentFormSubmitHandler";
import PunishmentFormLayout from "./form/PunishmentFormLayout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FormLabel } from "@/components/ui/form";
import { UploadCloud, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePunishmentIcon } from "./hooks/usePunishmentIcon";
import { useDeleteDialog } from "./hooks/useDeleteDialog";

interface Props {
  punishmentData?: PunishmentData;
  onSave: (data: PunishmentData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (index: string) => void;
}

const PunishmentEditorForm: React.FC<Props> = ({
  punishmentData,
  onSave,
  onCancel,
  onDelete,
}) => {
  const { isDeleteDialogOpen, setIsDeleteDialogOpen } = useDeleteDialog();
  const {
    selectedIconName,
    iconPreview,
    handleSelectIcon,
    handleUploadIcon,
    handleRemoveIcon,
    setSelectedIconName,
  } = usePunishmentIcon(punishmentData?.icon_name);

  const { watch, setValue } = useFormContext();
  const images = watch("background_images") || [];
  const carouselTimer = watch("carousel_timer") ?? 5;
  const focalPointX = watch("focal_point_x") ?? 50;
  const focalPointY = watch("focal_point_y") ?? 50;
  const opacity = watch("background_opacity") ?? 1;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const uploaded = Array.from(e.target.files).map((f) =>
      URL.createObjectURL(f)
    );
    setValue("background_images", [...images, ...uploaded]);
  };

  const handleRemove = () => {
    const updated = images.filter((_, i) => i !== selectedIndex);
    setValue("background_images", updated);
    setSelectedIndex(Math.max(0, selectedIndex - 1));
  };

  const handleSetFocal = (e: React.MouseEvent) => {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((e.clientX - bounds.left) / bounds.width) * 100;
    const y = ((e.clientY - bounds.top) / bounds.height) * 100;
    setValue("focal_point_x", x);
    setValue("focal_point_y", y);
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    handleSetFocal(e);
  };

  return (
    <PunishmentFormProvider punishmentData={punishmentData}>
      <PunishmentFormLayout>
        <PunishmentBasicDetails />
        <PunishmentIconSection
          iconPreview={iconPreview}
          selectedIconName={selectedIconName}
          onSelectIcon={handleSelectIcon}
          onUploadIcon={handleUploadIcon}
          onRemoveIcon={handleRemoveIcon}
        />
        <PunishmentColorSettings />

        {/* Embedded Background Image Editor */}
        <div className="space-y-4 border border-blue-500/30 rounded-xl bg-muted/10 p-4">
          <FormLabel className="text-white text-lg">Background Images</FormLabel>

          <div className="flex items-center gap-3">
            <label className="text-white text-sm w-32">Carousel Timer</label>
            <Button onClick={() => setValue("carousel_timer", Math.max(1, carouselTimer - 1))}>-</Button>
            <span className="w-10 text-center text-white">{carouselTimer}</span>
            <Button onClick={() => setValue("carousel_timer", carouselTimer + 1)}>+</Button>
            <span className="text-white text-sm">(s)</span>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {images.map((img: string, i: number) => (
              <img
                key={i}
                src={img}
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  "w-14 h-14 rounded border-2 object-cover cursor-pointer",
                  selectedIndex === i
                    ? "border-blue-400"
                    : "border-transparent hover:border-muted-foreground/30"
                )}
              />
            ))}
            <label className="flex items-center justify-center w-14 h-14 bg-muted/20 border border-dashed border-muted-foreground rounded cursor-pointer">
              <UploadCloud className="w-6 h-6 text-muted-foreground" />
              <input type="file" className="hidden" multiple accept="image/*" onChange={handleUpload} />
            </label>
          </div>

          {images[selectedIndex] && (
            <div
              ref={previewRef}
              className="relative mt-2 overflow-hidden rounded-lg border border-muted"
              onClick={handleSetFocal}
              onMouseDown={() => (dragRef.current = true)}
              onMouseUp={() => (dragRef.current = false)}
              onMouseMove={handleDrag}
              style={{
                aspectRatio: "3 / 1",
                backgroundImage: `url(${images[selectedIndex]})`,
                backgroundSize: "cover",
                backgroundPosition: `${focalPointX}% ${focalPointY}%`,
                opacity: opacity,
              }}
            >
              <div
                className="absolute z-10 w-4 h-4 bg-blue-400 border-2 border-white rounded-full cursor-move"
                style={{
                  top: `calc(${focalPointY}% - 8px)`,
                  left: `calc(${focalPointX}% - 8px)`,
                }}
              />
              <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                Click and drag to adjust focal point
              </span>
            </div>
          )}

          <Button variant="destructive" onClick={handleRemove} className="mt-2">
            <Trash2 className="mr-2 w-4 h-4" /> Remove Image
          </Button>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm text-white">
              <span>Image Opacity ({Math.round(opacity * 100)}%)</span>
            </div>
            <Slider
              value={[opacity]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([val]) => setValue("background_opacity", val)}
            />
          </div>
        </div>

        <PunishmentFormActions
          onCancel={onCancel}
          onDelete={onDelete}
          isDeleteDialogOpen={isDeleteDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        />
        <PunishmentFormSubmitHandler onSave={onSave} />
      </PunishmentFormLayout>
    </PunishmentFormProvider>
  );
};

export default PunishmentEditorForm;