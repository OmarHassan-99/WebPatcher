import CustomProfileButton from "./CustomProfileButton";

export default function ProfileSidePanel({
  user,
  showField,
  handleTabSwitch,
  formData,
}) {
  return (
    <div className="flex flex-col justify-between md:w-1/3 text-center">
      {/* Tab Switch */}
      <div className="flex flex-wrap gap-6 justify-center relative border-b border-surface-700 pb-2">
        <CustomProfileButton
          handleClick={() => handleTabSwitch("name&email")}
          isActive={showField === "name&email"}
          label="Name & Email"
        />
        {(!user.githubUsername || user.isSetPassword) && (
          <CustomProfileButton
            handleClick={() => handleTabSwitch("password")}
            isActive={showField === "password"}
            label="Change Password"
          />
        )}
        <CustomProfileButton
          handleClick={() => handleTabSwitch("githubLink")}
          isActive={showField === "githubLink"}
          label="GitHub Link"
        />
        {user.githubUsername && !user.isSetPassword && (
          <CustomProfileButton
            handleClick={() => handleTabSwitch("setPassword")}
            isActive={showField === "setPassword"}
            label="Set Password"
          />
        )}
        <CustomProfileButton
          handleClick={() => handleTabSwitch("dangerZone")}
          isActive={showField === "dangerZone"}
          label="Danger Zone"
        />
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mt-6">
        <div className="relative size-32 rounded-full overflow-hidden shadow-lg">
          {user.githubUsername ? (
            <img
              src={`https://avatars.githubusercontent.com/${user.githubUsername}`}
              alt="GitHub Avatar"
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-surface-700 flex items-center justify-center text-4xl font-bold text-white border border-surface-600">
              {formData.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h3 className="mt-4 text-xl font-semibold text-white">
          {formData.name}
        </h3>
        <p className="text-surface-400">{formData.email}</p>
      </div>
    </div>
  );
}
