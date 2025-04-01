module default {
	abstract type Dated {
		required property created_at -> datetime {
			default := datetime_of_statement();
		}
	}

	scalar type Device extending enum<Mobile, Desktop, Both>;

	type Player extending Dated {
		required property name -> str {
			constraint exclusive;
		};

		multi link entries := (select .<player[is Entry] filter .status = Status.Approved);
		multi link verifications := (select .<verifier[is Level] order by .placement);
		multi link unverified_entries := (select .<player[is Entry] filter .status != Status.Approved);
		points := <int32>sum((select .entries).level.points) + <int32>sum((select .verifications).points);
		rank := getPlayerRank(<Player>.id);
		required property device -> Device {
			default := Device.Both;
		};
	}

	scalar type ProfileShape extending enum<Circle, Squircle, Square, Cube, Ball, Cat, Bouba, Kiki>;
	scalar type AccountStatus extending enum<None, Migrating, Done>;

	type Account extending Dated {
		multi link tokens := .<account[is AuthToken];

		required property status -> AccountStatus {
			default := AccountStatus.None;
		};

		required property image -> str {
			default := "";
		};
		required property profile_shape -> ProfileShape {
			default := ProfileShape.Circle
		};

		required property oauth2 -> str;
		required property email -> str {
			constraint exclusive;
		};

		link player -> Player {
			default := <default::Player>{};
		};

		link discord -> Discord {
			default := <default::Discord>{};
		};
		property youtube -> str;

		required property mod -> bool {
			default := false;
		};
	}

	type AuthToken {
		required property token -> str;
		required property expires -> datetime {
			default := <datetime>(datetime_of_statement() + <cal::relative_duration>'7d');
		};

		required link account -> Account;
	}

	type Discord {
		required property user_id -> str;
		required property username -> str;
		required property global_name -> str;
		required property avatar -> str;
		required property accent_color -> str {
			default := '000000'
		};
		required property banner -> str {
			default := ""
		};
	}

	type MigrationRequest extending Dated {
		required link discord -> Discord;
		required link account -> Account;
		required link player -> Player;
	}

	scalar type Status extending enum<Submitted, Waiting, Investigating, Approved, Denied>;

	type Entry extending Dated {
		required property video_id -> str;
		property raw_video -> str;
		required property time -> duration;

		required property status -> Status;
		required property mobile -> bool {
			default := false;
		};

		required link player -> Player;
		required link level -> Level;
		rank := getTimeRank(<Entry>.id);
		property reason -> str;
		property notes -> str;

		link mod -> Account;
	}

	scalar type ChangeType extending enum<Add, Edit, Remove>;
	type Changelog extending Dated {
		required property change_type -> ChangeType;
		property level_id -> int32;
		property name -> str;
		property creator -> str;
		property old_placement -> int32;
		property placement -> int32;
		property message -> str;
	}

    function getPlayerRank(player: Player) -> int32
        using (<int32>(<int64>count(Player filter .points > player.points) + 1));

	function getTimeRank(entry: Entry) -> int32
        using (<int32>(<int64>count(Entry filter .time < entry.time and .level = entry.level and .status = Status.Approved) + 1));

	# function getPoints(place: int32) -> int32
	# 	using (<int32>math::ceil(43 * (place ^ (-1.33)) - 85.989 * (place ^ 0.2924) + 311.28 * (1.0016822 ^ place)) if place <= 150 else <int32>0);

	# function getPoints(place: int32) -> int32
	#     using (<int32>round(290 / (1 + (0.001 * (2.71828 ^ (0.030509 * (place + 150))))) - 13.1) if place <= 150 else <int32>0);

	function getPoints(place: int32) -> int32
	    using (<int32>round(190.5 / (math::lg(0.0032 * (place + 89.8)) + 1) - 211.29) if place <= 150 else <int32>0);

	type Level extending Dated {
		required property name -> str;
		required property creator -> str;
		required property level_id -> int32 {
			constraint exclusive;
		};
		required property video_id -> str;
		required property placement -> int32 {
			default := (count(Level) + 1);
		};

		points := getPoints(.placement);

		required link verifier -> Player;

		multi link entries := .<level[is Entry];

		trigger level_add after insert for each do (
			insert Changelog {
				change_type := ChangeType.Add,
				level_id := __new__.level_id,
				name := __new__.name,
				creator := __new__.creator,
				placement := __new__.placement
			}
		);

		trigger level_remove after delete for each do (
			insert Changelog {
				change_type := ChangeType.Remove,
				level_id := __old__.level_id,
				name := __old__.name,
				creator := __old__.creator,
				placement := __old__.placement
			}
		);

		trigger level_edit after update for each when (__old__.placement != __new__.placement) do (
			insert Changelog {
				change_type := ChangeType.Edit,
				level_id := __new__.level_id,
				name := __new__.name,
				creator := __new__.creator,
				old_placement := __old__.placement,
				placement := __new__.placement
			}
		);
	}
}
