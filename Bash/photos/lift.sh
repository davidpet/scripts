ROOT_FOLDER="$1"

for topentry in  $ROOT_FOLDER/*
do
  if [ -d "$topentry" ]
  then
    YEAR_FOLDER="$topentry"
    echo "Processing year $YEAR_FOLDER"

    for bottomentry in $YEAR_FOLDER/*
    do
      if [ -d "$bottomentry" ]
      then
        DAY_FOLDER="$bottomentry"
        MONTH_FOLDER=$(echo "$DAY_FOLDER" | rev | cut -d '_' -f 2- | rev)

        if [ ! -d "$MONTH_FOLDER" ]
        then
          echo "Creating directory $MONTH_FOLDER"
          mkdir "$MONTH_FOLDER"
        fi

        echo "Moving contents of '$DAY_FOLDER' to '$MONTH_FOLDER'"
        mv $DAY_FOLDER/* "$MONTH_FOLDER"
        rmdir "$DAY_FOLDER"
      fi
    done
  fi
done

