import React, { memo } from "react";
import usePfp from "../../hooks/usePfp";
import UserDefaultPfp from "./user.svg";
import WorkspaceDefaultPfp from "./workspace.svg";

const UserIcon = memo(({ role }) => {
  const { pfp } = usePfp();

  return (
    <div className="relative w-[35px] h-[35px] rounded-full flex-shrink-0 overflow-hidden">
      {role === "user" && <RenderUserPfp pfp={pfp} />}
      {role !== "user" && (
        <img
          src={WorkspaceDefaultPfp}
          alt="system profile picture"
          className="flex items-center justify-center"
        />
      )}
    </div>
  );
});

function RenderUserPfp({ pfp }) {
  if (!pfp)
    return (
      <img
        src={UserDefaultPfp}
        alt="User profile picture"
        className="border-none rounded-full"
      />
    );

  return (
    <img
      src={pfp}
      alt="User profile picture"
      className="absolute top-0 left-0 object-cover w-full h-full border-none rounded-full"
    />
  );
}

export default UserIcon;
