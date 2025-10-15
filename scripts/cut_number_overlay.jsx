/**
 * cut_number_overlay.jsx
 *
 * Adobe Premiere Pro ExtendScript that reads the clips on the first video track (V1)
 * of the active sequence and overlays numbered Essential Graphics for each cut.
 *
 * 使い方:
 *  1. シーケンスを開き、V1にカットを配置します。
 *  2. Premiere Proでスクリプトを実行します (ファイル > スクリプト > スクリプトの実行)。
 *  3. スクリプトはV1の各カットに対応する番号付きテキストを新しいトラックへ生成します。
 *
 * 主な処理:
 *  - V1のクリップを順番に取得し、開始・終了タイムを取得。
 *  - オーバーレイトラックを確認し、存在しない場合は追加。
 *  - Essential Graphicsのテキストレイヤーを生成し、カット番号を表示。
 *  - スクリプトが生成した既存のオーバーレイを再実行時にクリーンアップ。
 */

(function cutNumberOverlay() {
    var CUT_LABEL_PREFIX = "[CutNum]";
    var DEFAULT_FONT = "Arial";
    var DEFAULT_FONT_SIZE = 90;
    var POSITION_CENTER = [0.5, 0.5];
    var JUSTIFY_CENTER = 2; // 0: left, 1: center, 2: right

    if (!app.project) {
        alert("Premiere Pro プロジェクトが見つかりません。");
        return;
    }

    var sequence = app.project.activeSequence;
    if (!sequence) {
        alert("アクティブなシーケンスがありません。");
        return;
    }

    if (sequence.videoTracks.numTracks === 0) {
        alert("シーケンスにビデオトラックがありません。");
        return;
    }

    var sourceTrack = sequence.videoTracks[0];
    if (!sourceTrack || sourceTrack.clips.numItems === 0) {
        alert("V1にカットが見つかりませんでした。");
        return;
    }

    app.enableQE();
    if (typeof qe === "undefined" || !qe.project || !qe.project.getActiveSequence()) {
        alert("QE APIからアクティブシーケンスを取得できませんでした。");
        return;
    }

    // オーバーレイ描画用のビデオトラック (V2 以降) を取得/作成
    var overlayTrackIndex = ensureOverlayTrack(sequence);
    if (overlayTrackIndex === 0) {
        overlayTrackIndex = ensureOverlayTrack(sequence, true);
    }
    var overlayTrack = sequence.videoTracks[overlayTrackIndex];

    if (!overlayTrack) {
        alert("オーバーレイトラックを確保できませんでした。");
        return;
    }

    // 古いオーバーレイを削除
    removeExistingOverlays(overlayTrack, CUT_LABEL_PREFIX);

    var clipCount = sourceTrack.clips.numItems;
    for (var i = 0; i < clipCount; i++) {
        var clip = sourceTrack.clips[i];
        if (!clip) {
            continue;
        }

        var cutNumber = i + 1;
        var labelText = "Cut " + cutNumber;
        var startTicks = clip.start.ticks;
        var endTicks = clip.end.ticks;

        var graphic = sequence.graphics.createGraphic();
        if (!graphic) {
            alert("Essential Graphicsを生成できませんでした。");
            return;
        }

        graphic.name = CUT_LABEL_PREFIX + " " + cutNumber;
        graphic.startTime = clip.start; // Set start/end as Time objects.
        graphic.endTime = clip.end;

        var textLayer = graphic.addText();
        if (!textLayer) {
            alert("テキストレイヤーを作成できませんでした。");
            return;
        }

        textLayer.sourceText = labelText;

        // テキストレイヤーのスタイル設定
        if (textLayer.textProperties) {
            textLayer.textProperties.font = DEFAULT_FONT;
            textLayer.textProperties.fontSize = DEFAULT_FONT_SIZE;
            textLayer.textProperties.fillColor = [1.0, 1.0, 1.0];
            textLayer.textProperties.strokeEnabled = true;
            textLayer.textProperties.strokeColor = [0.0, 0.0, 0.0];
            textLayer.textProperties.strokeSize = 6;
            textLayer.textProperties.justification = JUSTIFY_CENTER;
        }

        if (textLayer.transform) {
            textLayer.transform.position = POSITION_CENTER;
            textLayer.transform.scale = [100, 100];
        }

        // 配置
        graphic.moveToTrack(overlayTrackIndex, 0, startTicks);
        graphic.end = endTicks;
    }

    alert("カット番号のオーバーレイが作成されました。");

    function ensureOverlayTrack(seq, forceCreate) {
        if (forceCreate === void 0) {
            forceCreate = false;
        }

        var trackCount = seq.videoTracks.numTracks;
        if (trackCount > 1 && !forceCreate) {
            return trackCount - 1;
        }

        seq.videoTracks.addTrack();
        return seq.videoTracks.numTracks - 1;
    }

    function removeExistingOverlays(track, prefix) {
        var clips = track.clips;
        if (!clips) {
            return;
        }

        for (var i = clips.numItems - 1; i >= 0; i--) {
            var item = clips[i];
            if (item && item.name && item.name.indexOf(prefix) === 0) {
                track.removeClip(item);
            }
        }
    }
})();
