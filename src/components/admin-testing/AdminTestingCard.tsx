
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { AdminTestingCardData } from "./defaultAdminTestingCards";
import { AdminTestingEditModal } from "./AdminTestingEditModal";

interface AdminTestingCardProps {
  card: AdminTestingCardData;
  onUpdate: (updatedCard: AdminTestingCardData) => void;
}

export function AdminTestingCard({ card, onUpdate }: AdminTestingCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <Card className="w-full">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-bold text-lg">{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.description}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
      <AdminTestingEditModal
        open={isEditing}
        onOpenChange={setIsEditing}
        card={card}
        onSave={onUpdate}
      />
    </>
  );
}
