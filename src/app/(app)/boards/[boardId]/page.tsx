import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { getBoardForUser } from "@/lib/queries/boards";
import { listBoardObjects } from "@/lib/queries/board-objects";
import { BoardClient } from "@/components/board/board-client";

type Params = Promise<{ boardId: string }>;

export default async function BoardPage({ params }: { params: Params }) {
  const { boardId } = await params;
  const profile = (await getCurrentProfile())!;

  const board = await getBoardForUser(boardId, profile.id);
  if (!board) notFound();

  const objects = await listBoardObjects(boardId);

  return (
    <div className="flex flex-1 flex-col">
      <BoardClient
        boardId={boardId}
        title={board.title}
        role={board.role}
        initialObjects={objects}
      />
    </div>
  );
}
